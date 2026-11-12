-- Transaction-safe order workflows. Public wrappers validate auth/role; clients never write order totals directly.
create function app_private.add_event(p_order uuid,p_kind text,p_from public.order_status,p_to public.order_status,p_actor uuid,p_source text,p_note text default null)
returns bigint language plpgsql security definer set search_path=pg_catalog,public,app_private
as $$
declare v_id bigint;
begin
 insert into public.order_events(order_id,event_type,from_status,to_status,actor_user_id,source,reason)
 values(p_order,p_kind,p_from,p_to,p_actor,p_source,left(p_note,500)) returning id into v_id;
 if p_from is distinct from p_to then
  insert into public.order_status_history(order_id,from_status,to_status,actor_user_id,source,note)
  values(p_order,p_from,p_to,p_actor,p_source,left(p_note,500));
 end if;
 return v_id;
end $$;
revoke all on function app_private.add_event(uuid,text,public.order_status,public.order_status,uuid,text,text) from public,anon,authenticated;

create function app_private.enqueue_event(p_event bigint,p_order uuid,p_kind text)
returns void language plpgsql security definer set search_path=pg_catalog,public
as $$
declare v_template text;
begin
 if not exists(select 1 from public.orders o join public.customer_notification_preferences n using(customer_id)
  where o.id=p_order and n.whatsapp_order_updates and n.consent_at is not null and n.revoked_at is null) then return; end if;
 v_template:=case p_kind when 'order_received' then 'order_received' when 'quote_ready' then 'quote_ready'
  when 'order_confirmed' then 'order_confirmed' when 'order_preparing' then 'order_preparing'
  when 'order_out_for_delivery' then 'order_out_for_delivery' when 'order_delivered' then 'order_delivered'
  when 'order_cancelled' then 'order_cancelled' else null end;
 if v_template is null then return; end if;
 insert into public.notification_outbox(order_event_id,order_id,event_type,template_name)
 values(p_event,p_order,p_kind,v_template) on conflict(order_event_id,channel) do nothing;
end $$;
revoke all on function app_private.enqueue_event(bigint,uuid,text) from public,anon,authenticated;

create function app_private.create_order_impl(
 p_key uuid,p_area uuid,p_address uuid,p_name text,p_phone text,p_address_line text,p_landmark text,p_note text,
 p_lat numeric,p_lon numeric,p_items jsonb
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,app_private,auth,extensions
as $$
declare
 v_customer uuid:=auth.uid(); v_area public.delivery_areas%rowtype; v_saved public.customer_addresses%rowtype;
 v_settings public.store_settings%rowtype; v_product public.products%rowtype; v_item record;
 v_name text; v_phone text; v_line text; v_landmark text; v_lat numeric; v_lon numeric;
 v_subtotal numeric(12,2):=0; v_count integer; v_hash bytea; v_payload jsonb; v_order uuid; v_existing public.orders%rowtype; v_event bigint;
begin
 if v_customer is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
 if p_key is null or p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 100 then
  raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 select * into v_settings from public.store_settings where id=true;
 if not found or not v_settings.orders_enabled then raise exception using errcode='P0001',message='ORDERS_DISABLED'; end if;
 select * into v_area from public.delivery_areas a where a.id=p_area and a.is_active
  and (a.effective_from is null or a.effective_from<=now()) and (a.effective_until is null or a.effective_until>now());
 if not found then raise exception using errcode='P0001',message='AREA_UNAVAILABLE'; end if;
 if exists(select 1 from jsonb_to_recordset(p_items) x(product_id uuid,quantity integer)
  where x.product_id is null or x.quantity is null or x.quantity not between 1 and 99)
  or exists(select 1 from jsonb_to_recordset(p_items) x(product_id uuid,quantity integer) group by x.product_id having count(*)>1) then
  raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 select count(*) into v_count from jsonb_to_recordset(p_items) x(product_id uuid,quantity integer);
 if v_count>v_settings.max_order_items then raise exception using errcode='22023',message='TOO_MANY_ITEMS'; end if;
 if p_address is not null then
  select * into v_saved from public.customer_addresses a where a.id=p_address and a.customer_id=v_customer;
  if not found or v_saved.area_id<>p_area then raise exception using errcode='P0001',message='ADDRESS_INVALID'; end if;
  v_name:=v_saved.recipient_name; v_phone:=v_saved.phone_e164; v_line:=v_saved.address_line;
  v_landmark:=v_saved.landmark; v_lat:=v_saved.latitude; v_lon:=v_saved.longitude;
 else
  v_name:=btrim(coalesce(p_name,'')); v_phone:=btrim(coalesce(p_phone,'')); v_line:=btrim(coalesce(p_address_line,''));
  v_landmark:=nullif(btrim(coalesce(p_landmark,'')),''); v_lat:=p_lat; v_lon:=p_lon;
 end if;
 if v_name is null or v_name='' or char_length(v_name)>100 or v_phone !~ '^\+[1-9][0-9]{7,14}$'
  or v_line is null or v_line='' or char_length(v_line)>500 or (v_lat is null)<>(v_lon is null)
  or (v_lat is not null and (v_lat not between -90 and 90 or v_lon not between -180 and 180))
  or char_length(coalesce(p_note,''))>1000 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 v_payload:=jsonb_build_object('area',p_area,'address_id',p_address,'name',v_name,'phone',v_phone,'line',v_line,
  'landmark',v_landmark,'lat',v_lat,'lon',v_lon,'note',nullif(btrim(coalesce(p_note,'')),''),
  'items',(select jsonb_agg(jsonb_build_object('product_id',x.product_id,'quantity',x.quantity) order by x.product_id)
   from jsonb_to_recordset(p_items) x(product_id uuid,quantity integer)));
 v_hash:=extensions.digest(convert_to(v_payload::text,'UTF8'),'sha256');
 insert into public.orders(public_code,customer_id,idempotency_key,request_hash,status,area_id,area_name_snapshot,
  recipient_name_snapshot,phone_snapshot,address_snapshot,landmark_snapshot,latitude,longitude,customer_note,
  estimated_subtotal,estimated_delivery_fee,estimated_total)
 values('AB-'||upper(encode(extensions.gen_random_bytes(5),'hex')),v_customer,p_key,v_hash,'pending_verification',p_area,v_area.name,
  v_name,v_phone,v_line,v_landmark,v_lat,v_lon,nullif(btrim(coalesce(p_note,'')),''),0,v_area.fee,v_area.fee)
 on conflict(customer_id,idempotency_key) do nothing returning id into v_order;
 if v_order is null then
  select * into v_existing from public.orders where customer_id=v_customer and idempotency_key=p_key;
  if v_existing.request_hash<>v_hash then raise exception using errcode='P0001',message='IDEMPOTENCY_CONFLICT'; end if;
  return jsonb_build_object('orderId',v_existing.id,'publicCode',v_existing.public_code,'status',v_existing.status,
   'estimatedSubtotal',v_existing.estimated_subtotal::text,'estimatedDeliveryFee',v_existing.estimated_delivery_fee::text,
   'estimatedTotal',v_existing.estimated_total::text,'quoteVersion',v_existing.quote_version,'createdAt',v_existing.created_at,'replayed',true);
 end if;
 for v_item in select x.product_id,x.quantity from jsonb_to_recordset(p_items) x(product_id uuid,quantity integer) order by x.product_id loop
  select p.* into v_product from public.products p join public.shops s on s.id=p.shop_id and s.is_active
   join public.categories c on c.id=p.category_id and c.is_active where p.id=v_item.product_id and p.is_active and p.is_available;
  if not found then raise exception using errcode='P0001',message='ITEM_UNAVAILABLE'; end if;
  if v_product.track_stock and not exists(select 1 from public.product_inventory i where i.product_id=v_product.id and i.on_hand-i.reserved>=v_item.quantity) then
   raise exception using errcode='P0001',message='STOCK_CONFLICT'; end if;
  v_subtotal:=v_subtotal+v_product.price*v_item.quantity;
  insert into public.order_items(order_id,product_id,shop_id,requested_name,requested_unit_label,requested_unit_price,quantity)
  values(v_order,v_product.id,v_product.shop_id,v_product.name,v_product.unit_label,v_product.price,v_item.quantity);
 end loop;
 update public.orders set estimated_subtotal=v_subtotal,estimated_total=v_subtotal+v_area.fee where id=v_order;
 v_event:=app_private.add_event(v_order,'order_received',null,'pending_verification',v_customer,'customer_app','Request received; shop verification and customer approval are still required.');
 perform app_private.enqueue_event(v_event,v_order,'order_received');
 return jsonb_build_object('orderId',v_order,'publicCode',(select public_code from public.orders where id=v_order),
  'status','pending_verification','estimatedSubtotal',v_subtotal::text,'estimatedDeliveryFee',v_area.fee::text,
  'estimatedTotal',(v_subtotal+v_area.fee)::text,'quoteVersion',0,'createdAt',now(),'replayed',false);
end $$;

create function public.create_order(
 p_idempotency_key uuid,p_area_id uuid,p_address_id uuid default null,p_recipient_name text default null,
 p_phone_e164 text default null,p_address_line text default null,p_landmark text default null,p_customer_note text default null,
 p_latitude numeric default null,p_longitude numeric default null,p_items jsonb default '[]'::jsonb
) returns jsonb language sql security definer set search_path=pg_catalog,public,app_private,auth,extensions
as $$ select app_private.create_order_impl(p_idempotency_key,p_area_id,p_address_id,p_recipient_name,p_phone_e164,p_address_line,p_landmark,p_customer_note,p_latitude,p_longitude,p_items); $$;

create function public.record_notification_consent(p_enabled boolean,p_source text)
returns void language plpgsql security definer set search_path=pg_catalog,public,auth
as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
 if p_source is null or char_length(p_source)>100 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 insert into public.customer_notification_preferences(customer_id,whatsapp_order_updates,consent_source,consent_at,revoked_at)
 values(v_user,p_enabled,p_source,case when p_enabled then now() end,case when p_enabled then null else now() end)
 on conflict(customer_id) do update set whatsapp_order_updates=excluded.whatsapp_order_updates,consent_source=excluded.consent_source,
  consent_at=case when excluded.whatsapp_order_updates then now() else public.customer_notification_preferences.consent_at end,
  revoked_at=case when excluded.whatsapp_order_updates then null else now() end,updated_at=now();
end $$;

-- Quote totals are derived only from verified order item lines and the operator-supplied fee.
create function public.save_order_quote(p_order_id uuid,p_expected_quote_version integer,p_lines jsonb,p_delivery_fee numeric,p_eta text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
declare v_order public.orders%rowtype; v_line record; v_item public.order_items%rowtype; v_count integer; v_subtotal numeric(12,2):=0; v_event bigint;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
 if not app_private.has_role(array['admin','order_operator']::app_private.staff_role[]) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 if p_lines is null or jsonb_typeof(p_lines)<>'array' or p_delivery_fee is null or p_delivery_fee<0 or char_length(coalesce(p_eta,''))>100 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='ORDER_NOT_FOUND'; end if;
 if v_order.status not in ('pending_verification','awaiting_customer_approval') or v_order.quote_version<>p_expected_quote_version then raise exception using errcode='P0001',message='QUOTE_STALE'; end if;
 select count(*) into v_count from public.order_items where order_id=p_order_id;
 if jsonb_array_length(p_lines)<>v_count or exists(select 1 from jsonb_to_recordset(p_lines) x(order_item_id uuid,result text) group by x.order_item_id having count(*)>1) then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 for v_line in select * from jsonb_to_recordset(p_lines) x(order_item_id uuid,result text,verified_unit_price numeric,alternative_product_id uuid,alternative_name text,note text) loop
  select * into v_item from public.order_items where id=v_line.order_item_id and order_id=p_order_id for update;
  if not found or v_line.result not in ('available','unavailable','substituted') then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  if v_line.result in ('available','substituted') and (v_line.verified_unit_price is null or v_line.verified_unit_price<0) then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  if v_line.result='substituted' and v_line.alternative_product_id is null and nullif(btrim(coalesce(v_line.alternative_name,'')),'') is null then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
  if v_line.alternative_product_id is not null and not exists(select 1 from public.products p join public.shops s on s.id=p.shop_id and s.is_active join public.categories c on c.id=p.category_id and c.is_active where p.id=v_line.alternative_product_id and p.is_active and p.is_available) then raise exception using errcode='P0001',message='ITEM_UNAVAILABLE'; end if;
  update public.order_items set fulfillment_state=v_line.result::public.item_fulfillment,
   fulfilled_product_id=case when v_line.result='substituted' then v_line.alternative_product_id else product_id end,
   fulfilled_name=case when v_line.result='substituted' then coalesce(nullif(btrim(v_line.alternative_name),''),(select name from public.products where id=v_line.alternative_product_id)) else requested_name end,
   final_unit_price=case when v_line.result='unavailable' then null else v_line.verified_unit_price end where id=v_item.id;
  insert into public.order_item_checks(order_item_id,checked_by,result,verified_unit_price,alternative_product_id,alternative_name,note)
   values(v_item.id,auth.uid(),v_line.result::public.item_fulfillment,v_line.verified_unit_price,v_line.alternative_product_id,left(v_line.alternative_name,160),left(v_line.note,500));
 end loop;
 if not exists(select 1 from public.order_items where order_id=p_order_id and fulfillment_state in ('available','substituted')) then raise exception using errcode='P0001',message='NO_FULFILLABLE_ITEMS'; end if;
 select coalesce(sum(quantity*final_unit_price),0)::numeric(12,2) into v_subtotal from public.order_items where order_id=p_order_id and fulfillment_state in ('available','substituted');
 update public.orders set status='awaiting_customer_approval',customer_decision='pending',quote_version=quote_version+1,
  final_subtotal=v_subtotal,final_delivery_fee=p_delivery_fee,final_total=v_subtotal+p_delivery_fee,estimated_eta=nullif(btrim(coalesce(p_eta,'')),'') where id=p_order_id;
 v_event:=app_private.add_event(p_order_id,'quote_ready',v_order.status,'awaiting_customer_approval',auth.uid(),'admin','Shop verification quote prepared.');
 perform app_private.enqueue_event(v_event,p_order_id,'quote_ready');
 return jsonb_build_object('orderId',p_order_id,'status','awaiting_customer_approval','quoteVersion',v_order.quote_version+1,
  'finalSubtotal',v_subtotal::text,'finalDeliveryFee',p_delivery_fee::text,'finalTotal',(v_subtotal+p_delivery_fee)::text);
end $$;

create function app_private.apply_decision(p_order uuid,p_version integer,p_decision public.customer_decision,p_source text,p_actor uuid,p_note text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
declare v_order public.orders%rowtype; v_item record; v_event bigint; v_next public.order_status;
begin
 select * into v_order from public.orders where id=p_order for update;
 if not found then raise exception using errcode='P0002',message='ORDER_NOT_FOUND'; end if;
 if v_order.status<>'awaiting_customer_approval' or v_order.quote_version<>p_version then raise exception using errcode='P0001',message='QUOTE_STALE'; end if;
 insert into public.customer_order_decisions(order_id,customer_id,quote_version,decision,source,recorded_by,note)
 values(p_order,v_order.customer_id,p_version,p_decision,p_source,case when p_source='phone_call' then p_actor else null end,left(p_note,500));
 if p_decision='approved' then
  if not exists(select 1 from public.store_settings where id=true and cod_enabled) then raise exception using errcode='P0001',message='PAYMENT_METHOD_UNAVAILABLE'; end if;
  for v_item in select case when fulfillment_state='substituted' then fulfilled_product_id else product_id end product_id,sum(quantity)::integer quantity from public.order_items
   where order_id=p_order and (fulfillment_state='available' or (fulfillment_state='substituted' and fulfilled_product_id is not null)) group by 1 order by 1 loop
   if exists(select 1 from public.products where id=v_item.product_id and track_stock) then
    update public.product_inventory set reserved=reserved+v_item.quantity where product_id=v_item.product_id and on_hand-reserved>=v_item.quantity;
    if not found then raise exception using errcode='P0001',message='STOCK_CONFLICT'; end if;
    insert into public.stock_movements(product_id,order_id,actor_user_id,movement_type,quantity_delta,reason)
    values(v_item.product_id,p_order,p_actor,'reserve',v_item.quantity,'Customer approved quote');
   end if;
  end loop;
  v_next:='confirmed';
  update public.orders set status=v_next,customer_decision='approved',confirmed_at=now() where id=p_order;
  insert into public.cod_payments(order_id,status,amount_due) values(p_order,'pending',v_order.final_total) on conflict(order_id) do nothing;
 else
  v_next:=case when p_decision='rejected' then 'cancelled'::public.order_status else 'pending_verification'::public.order_status end;
  update public.orders set status=v_next,customer_decision=p_decision,cancelled_at=case when v_next='cancelled' then now() else cancelled_at end where id=p_order;
 end if;
 v_event:=app_private.add_event(p_order,case when p_decision='approved' then 'order_confirmed' when p_decision='rejected' then 'order_cancelled' else 'changes_requested' end,
  v_order.status,v_next,p_actor,p_source,coalesce(p_note,p_decision::text));
 perform app_private.enqueue_event(v_event,p_order,case when p_decision='approved' then 'order_confirmed' when p_decision='rejected' then 'order_cancelled' else 'changes_requested' end);
 return jsonb_build_object('orderId',p_order,'status',v_next,'decision',p_decision,'quoteVersion',p_version);
end $$;
revoke all on function app_private.apply_decision(uuid,integer,public.customer_decision,text,uuid,text) from public,anon,authenticated;

create function public.decide_order_quote(p_order_id uuid,p_quote_version integer,p_decision public.customer_decision)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
begin
 if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
 if not exists(select 1 from public.orders where id=p_order_id and customer_id=auth.uid()) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 if p_decision not in ('approved','changes_requested','rejected') then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 return app_private.apply_decision(p_order_id,p_quote_version,p_decision,'app',auth.uid(),null);
end $$;

create function public.record_phone_outcome(p_order_id uuid,p_quote_version integer,p_outcome text,p_note text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
declare v_order public.orders%rowtype;
begin
 if auth.uid() is null or not app_private.has_role(array['admin','order_operator']::app_private.staff_role[]) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 if p_outcome not in ('no_answer','callback_requested','approved','changes_requested','rejected') or char_length(coalesce(p_note,''))>500 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.status<>'awaiting_customer_approval' or v_order.quote_version<>p_quote_version then raise exception using errcode='P0001',message='QUOTE_STALE'; end if;
 insert into public.order_contact_attempts(order_id,quote_version,attempted_by,outcome,note) values(p_order_id,p_quote_version,auth.uid(),p_outcome,left(p_note,500));
 if p_outcome in ('no_answer','callback_requested') then return jsonb_build_object('orderId',p_order_id,'status',v_order.status,'callOutcome',p_outcome); end if;
 return app_private.apply_decision(p_order_id,p_quote_version,p_outcome::public.customer_decision,'phone_call',auth.uid(),p_note);
end $$;

create function public.transition_order(p_order_id uuid,p_next public.order_status,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
declare v_order public.orders%rowtype; v_item record; v_event bigint;
begin
 if auth.uid() is null or not app_private.has_role(array['admin','order_operator']::app_private.staff_role[]) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='ORDER_NOT_FOUND'; end if;
 if not ((v_order.status='confirmed' and p_next in ('preparing','cancelled')) or
  (v_order.status='preparing' and p_next in ('out_for_delivery','cancelled')) or
  (v_order.status='out_for_delivery' and p_next='delivered') or
  (v_order.status in ('pending_verification','awaiting_customer_approval') and p_next in ('cancelled','rejected','expired'))) then
  raise exception using errcode='P0001',message='INVALID_TRANSITION'; end if;
 if char_length(coalesce(p_reason,''))>500 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 if p_next in ('delivered','cancelled') then
  for v_item in select case when fulfillment_state='substituted' then fulfilled_product_id else product_id end product_id,sum(quantity)::integer quantity from public.order_items
   where order_id=p_order_id and (fulfillment_state='available' or (fulfillment_state='substituted' and fulfilled_product_id is not null)) group by 1 order by 1 loop
   if exists(select 1 from public.products where id=v_item.product_id and track_stock) then
    if p_next='delivered' then
     update public.product_inventory set on_hand=on_hand-v_item.quantity,reserved=reserved-v_item.quantity where product_id=v_item.product_id and on_hand>=v_item.quantity and reserved>=v_item.quantity;
     if not found then raise exception using errcode='P0001',message='STOCK_CONFLICT'; end if;
     insert into public.stock_movements(product_id,order_id,actor_user_id,movement_type,quantity_delta,reason) values(v_item.product_id,p_order_id,auth.uid(),'sale',-v_item.quantity,'Delivered order');
    else
     update public.product_inventory set reserved=reserved-v_item.quantity where product_id=v_item.product_id and reserved>=v_item.quantity;
     if found then insert into public.stock_movements(product_id,order_id,actor_user_id,movement_type,quantity_delta,reason) values(v_item.product_id,p_order_id,auth.uid(),'release',-v_item.quantity,'Cancelled order'); end if;
    end if;
   end if;
  end loop;
 end if;
 update public.orders set status=p_next,cancelled_at=case when p_next in ('cancelled','rejected','expired') then now() else cancelled_at end,
  completed_at=case when p_next='delivered' then now() else completed_at end where id=p_order_id;
 v_event:=app_private.add_event(p_order_id,'order_'||p_next::text,v_order.status,p_next,auth.uid(),'admin',p_reason);
 perform app_private.enqueue_event(v_event,p_order_id,'order_'||p_next::text);
 return jsonb_build_object('orderId',p_order_id,'status',p_next);
end $$;

create function public.record_cod_collection(p_order_id uuid,p_amount numeric,p_note text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
declare v_order public.orders%rowtype; v_cod public.cod_payments%rowtype; v_tolerance numeric(12,2);
begin
 if auth.uid() is null or not app_private.has_role(array['admin','order_operator']::app_private.staff_role[]) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 if p_amount is null or p_amount<0 or char_length(coalesce(p_note,''))>500 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.status not in ('out_for_delivery','delivered') then raise exception using errcode='P0001',message='INVALID_TRANSITION'; end if;
 select * into v_cod from public.cod_payments where order_id=p_order_id for update;
 if not found then raise exception using errcode='P0001',message='COD_NOT_AVAILABLE'; end if;
 select cod_tolerance into v_tolerance from public.store_settings where id=true;
 if p_amount>v_cod.amount_due+coalesce(v_tolerance,0) then raise exception using errcode='22023',message='AMOUNT_MISMATCH'; end if;
 update public.cod_payments set amount_collected=p_amount,status=case when p_amount=v_cod.amount_due then 'collected' else 'exception' end,
  collected_by=auth.uid(),collected_at=now(),note=left(p_note,500) where order_id=p_order_id;
 return jsonb_build_object('orderId',p_order_id,'status',case when p_amount=v_cod.amount_due then 'collected' else 'exception' end,
  'amountDue',v_cod.amount_due::text,'amountCollected',p_amount::text);
end $$;

create function public.assign_staff_role(p_user_id uuid,p_role text,p_active boolean default true,p_display_name text default '')
returns void language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
declare v_role app_private.staff_role;
begin
 if auth.uid() is null or not app_private.has_role(array['admin']::app_private.staff_role[]) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 if p_user_id is null or p_role not in ('admin','order_operator','catalog_manager') or char_length(coalesce(p_display_name,''))>100 or not exists(select 1 from auth.users where id=p_user_id) then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 v_role:=p_role::app_private.staff_role;
 insert into app_private.admin_profiles(user_id,display_name,is_active) values(p_user_id,left(p_display_name,100),p_active)
 on conflict(user_id) do update set display_name=excluded.display_name,is_active=excluded.is_active,updated_at=now();
 if p_active then insert into app_private.user_roles(user_id,role,assigned_by) values(p_user_id,v_role,auth.uid()) on conflict do nothing;
 else delete from app_private.user_roles where user_id=p_user_id and role=v_role; end if;
end $$;

create function public.record_inventory_adjustment(p_product_id uuid,p_quantity_delta integer,p_reason text)
returns void language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
declare v_track boolean;
begin
 if auth.uid() is null or not app_private.has_role(array['admin','catalog_manager']::app_private.staff_role[]) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 if p_quantity_delta=0 or p_quantity_delta not between -100000 and 100000 or nullif(btrim(coalesce(p_reason,'')),'') is null or char_length(p_reason)>300 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 select track_stock into v_track from public.products where id=p_product_id for update;
 if not found or not v_track then raise exception using errcode='P0001',message='STOCK_NOT_TRACKED'; end if;
 update public.product_inventory set on_hand=on_hand+p_quantity_delta where product_id=p_product_id and on_hand+p_quantity_delta>=reserved;
 if not found then raise exception using errcode='P0001',message='STOCK_CONFLICT'; end if;
 insert into public.stock_movements(product_id,actor_user_id,movement_type,quantity_delta,reason) values(p_product_id,auth.uid(),'adjustment',p_quantity_delta,p_reason);
end $$;

create function public.claim_notification_jobs(p_worker text,p_limit integer default 10)
returns setof public.notification_outbox language plpgsql security definer set search_path=pg_catalog,public
as $$
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 if p_worker is null or char_length(p_worker)>100 or p_limit not between 1 and 50 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 return query with jobs as (
  select id from public.notification_outbox where (status in ('pending','retry') and next_attempt_at<=now())
   or (status='processing' and lease_until<now()) order by next_attempt_at,created_at for update skip locked limit p_limit
 ) update public.notification_outbox n set status='processing',locked_by=p_worker,lease_until=now()+interval '2 minutes',
  attempt_count=n.attempt_count+1,updated_at=now() from jobs j where n.id=j.id returning n.*;
end $$;

create function public.complete_notification_job(p_outbox_id uuid,p_worker text,p_outcome text,p_message_id text default null,p_error_code text default null)
returns void language plpgsql security definer set search_path=pg_catalog,public
as $$
declare v_job public.notification_outbox%rowtype;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 if p_outcome not in ('sent','retry','dead_letter','unknown','skipped') then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 update public.notification_outbox set status=p_outcome,provider_message_id=coalesce(p_message_id,provider_message_id),last_error_code=left(p_error_code,100),
  locked_by=null,lease_until=null,next_attempt_at=case when p_outcome='retry' then now()+make_interval(secs=>least(3600,(power(2,least(attempt_count,10))*15)::integer)) else next_attempt_at end,updated_at=now()
 where id=p_outbox_id and status='processing' and locked_by=p_worker returning * into v_job;
 if not found then raise exception using errcode='P0001',message='LEASE_LOST'; end if;
 insert into public.notification_logs(outbox_id,attempt_number,outcome,provider_message_id,provider_error_code)
 values(v_job.id,v_job.attempt_count,p_outcome,p_message_id,left(p_error_code,100));
end $$;

create function public.record_notification_webhook(p_event_key text,p_message_id text,p_event_type text,p_error_code text default null)
returns boolean language plpgsql security definer set search_path=pg_catalog,public
as $$
declare v_outbox uuid;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 if p_event_key is null or char_length(p_event_key)>200 or p_event_type not in ('delivered','read','failed') then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 insert into public.notification_webhook_events(provider_event_key,provider_message_id,event_type,processed_at)
 values(p_event_key,p_message_id,p_event_type,now()) on conflict(provider_event_key) do nothing;
 if not found then return false; end if;
 select id into v_outbox from public.notification_outbox where provider_message_id=p_message_id;
 if v_outbox is not null then
  insert into public.notification_logs(outbox_id,attempt_number,outcome,provider_message_id,provider_error_code)
  select id,attempt_count,p_event_type,p_message_id,left(p_error_code,100) from public.notification_outbox where id=v_outbox;
 end if;
 return true;
end $$;

revoke all on function app_private.create_order_impl(uuid,uuid,uuid,text,text,text,text,text,numeric,numeric,jsonb) from public,anon,authenticated;
revoke all on function public.create_order(uuid,uuid,uuid,text,text,text,text,text,numeric,numeric,jsonb) from public,anon;
grant execute on function public.create_order(uuid,uuid,uuid,text,text,text,text,text,numeric,numeric,jsonb) to authenticated;
revoke all on function public.save_order_quote(uuid,integer,jsonb,numeric,text) from public,anon;
grant execute on function public.save_order_quote(uuid,integer,jsonb,numeric,text) to authenticated;
revoke all on function public.decide_order_quote(uuid,integer,public.customer_decision) from public,anon;
grant execute on function public.decide_order_quote(uuid,integer,public.customer_decision) to authenticated;
revoke all on function public.record_phone_outcome(uuid,integer,text,text) from public,anon;
grant execute on function public.record_phone_outcome(uuid,integer,text,text) to authenticated;
revoke all on function public.transition_order(uuid,public.order_status,text) from public,anon;
grant execute on function public.transition_order(uuid,public.order_status,text) to authenticated;
revoke all on function public.record_cod_collection(uuid,numeric,text) from public,anon;
grant execute on function public.record_cod_collection(uuid,numeric,text) to authenticated;
revoke all on function public.assign_staff_role(uuid,text,boolean,text) from public,anon,authenticated;
grant execute on function public.assign_staff_role(uuid,text,boolean,text) to authenticated;
revoke all on function public.record_inventory_adjustment(uuid,integer,text) from public,anon;
grant execute on function public.record_inventory_adjustment(uuid,integer,text) to authenticated;
revoke all on function public.record_notification_consent(boolean,text) from public,anon;
grant execute on function public.record_notification_consent(boolean,text) to authenticated;
revoke all on function public.claim_notification_jobs(text,integer) from public,anon,authenticated;
grant execute on function public.claim_notification_jobs(text,integer) to service_role;
revoke all on function public.complete_notification_job(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.complete_notification_job(uuid,text,text,text,text) to service_role;
revoke all on function public.record_notification_webhook(text,text,text,text) from public,anon,authenticated;
grant execute on function public.record_notification_webhook(text,text,text,text) to service_role;

