-- Create WhatsApp drafts transactionally using the existing server-validated order path.
create function public.create_whatsapp_order_draft(
 p_idempotency_key uuid,p_area_id uuid,p_address_id uuid,p_recipient_name text,p_phone_e164 text,
 p_address_line text,p_landmark text,p_customer_note text,p_latitude numeric,p_longitude numeric,p_items jsonb
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,app_private,auth,extensions
as $$
declare v_result jsonb; v_order uuid; v_event bigint;
begin
 v_result:=app_private.create_order_impl(p_idempotency_key,p_area_id,p_address_id,p_recipient_name,p_phone_e164,
  p_address_line,p_landmark,p_customer_note,p_latitude,p_longitude,p_items);
 v_order:=(v_result->>'orderId')::uuid;
 if coalesce((v_result->>'replayed')::boolean,false) then
  if v_result->>'status'<>'pending_submission' then raise exception using errcode='P0001',message='IDEMPOTENCY_CONFLICT'; end if;
  return v_result;
 end if;
 select id into v_event from public.order_events where order_id=v_order and event_type='order_received' order by id desc limit 1;
 if v_event is null then raise exception using errcode='P0001',message='ORDER_EVENT_MISSING'; end if;
 delete from public.notification_outbox where order_event_id=v_event;
 update public.orders set status='pending_submission' where id=v_order and status='pending_verification';
 if not found then raise exception using errcode='P0001',message='INVALID_TRANSITION'; end if;
 update public.order_events set event_type='whatsapp_draft_created',to_status='pending_submission',
  reason='Draft created; customer must manually send the WhatsApp message.' where id=v_event;
 update public.order_status_history set to_status='pending_submission',
  note='Draft created; customer must manually send the WhatsApp message.'
  where order_id=v_order and to_status='pending_verification' and created_at=(select max(created_at) from public.order_status_history where order_id=v_order);
 return v_result||jsonb_build_object('status','pending_submission','submissionRequired',true);
end $$;
revoke all on function public.create_whatsapp_order_draft(uuid,uuid,uuid,text,text,text,text,text,numeric,numeric,jsonb) from public,anon;
grant execute on function public.create_whatsapp_order_draft(uuid,uuid,uuid,text,text,text,text,text,numeric,numeric,jsonb) to authenticated;

-- A staff member can move a draft into normal verification only after receiving the WhatsApp message.
create or replace function public.transition_order(p_order_id uuid,p_next public.order_status,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
declare v_order public.orders%rowtype; v_item record; v_event bigint;
begin
 if auth.uid() is null or not app_private.has_role(array['admin','order_operator']::app_private.staff_role[]) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='ORDER_NOT_FOUND'; end if;
 if not ((v_order.status='pending_submission' and p_next='pending_verification') or
  (v_order.status='confirmed' and p_next in ('preparing','cancelled')) or
  (v_order.status='preparing' and p_next in ('out_for_delivery','cancelled')) or
  (v_order.status='out_for_delivery' and p_next='delivered') or
  (v_order.status in ('pending_verification','pending_submission','awaiting_customer_approval') and p_next in ('cancelled','rejected','expired'))) then
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
revoke all on function public.transition_order(uuid,public.order_status,text) from public,anon;
grant execute on function public.transition_order(uuid,public.order_status,text) to authenticated;

create or replace function public.customer_cancel_order(p_order_id uuid,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
declare v_order public.orders%rowtype; v_event bigint;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
 if char_length(coalesce(p_reason,''))>300 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 select * into v_order from public.orders where id=p_order_id and customer_id=auth.uid() for update;
 if not found then raise exception using errcode='P0002',message='ORDER_NOT_FOUND'; end if;
 if v_order.status not in ('pending_submission','pending_verification','awaiting_customer_approval') then raise exception using errcode='P0001',message='INVALID_TRANSITION'; end if;
 update public.orders set status='cancelled',customer_decision=case when v_order.status='awaiting_customer_approval' then 'rejected'::public.customer_decision else customer_decision end,cancelled_at=now() where id=p_order_id;
 v_event:=app_private.add_event(p_order_id,'order_cancelled',v_order.status,'cancelled',auth.uid(),'customer_app',p_reason);
 perform app_private.enqueue_event(v_event,p_order_id,'order_cancelled');
 return jsonb_build_object('orderId',p_order_id,'status','cancelled');
end $$;
revoke all on function public.customer_cancel_order(uuid,text) from public,anon;
grant execute on function public.customer_cancel_order(uuid,text) to authenticated;

-- Include WhatsApp drafts in the admin's pending workload without counting them as sales.
create or replace function public.admin_dashboard_metrics(p_from date,p_to date)
returns jsonb language plpgsql stable security definer
set search_path=pg_catalog,public,app_private,auth
as $$
declare v_result jsonb; v_start timestamptz; v_end timestamptz;
begin
 if auth.uid() is null or not app_private.has_role(array['admin','order_operator']::app_private.staff_role[]) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 v_start:=p_from::timestamp at time zone 'Asia/Dhaka'; v_end:=(p_to+1)::timestamp at time zone 'Asia/Dhaka';
 select jsonb_build_object(
  'total_orders',(select count(*) from public.orders o where o.created_at>=v_start and o.created_at<v_end),
  'pending_orders',(select count(*) from public.orders o where o.created_at>=v_start and o.created_at<v_end and o.status in ('pending_submission','pending_verification','awaiting_customer_approval')),
  'in_progress_orders',(select count(*) from public.orders o where o.created_at>=v_start and o.created_at<v_end and o.status in ('confirmed','preparing','out_for_delivery')),
  'completed_orders',(select count(*) from public.orders o where o.completed_at>=v_start and o.completed_at<v_end and o.status='delivered'),
  'cancelled_orders',(select count(*) from public.orders o where o.updated_at>=v_start and o.updated_at<v_end and o.status in ('cancelled','rejected')),
  'gross_sales',(select coalesce(sum(o.final_total),0) from public.orders o where o.completed_at>=v_start and o.completed_at<v_end and o.status='delivered'),
  'cod_collected',(select coalesce(sum(c.amount_collected),0) from public.cod_payments c where c.collected_at>=v_start and c.collected_at<v_end and c.status in ('collected','exception')),
  'outstanding_cod',(select coalesce(sum(greatest(c.amount_due-c.amount_collected,0)),0) from public.cod_payments c join public.orders o on o.id=c.order_id where o.status in ('out_for_delivery','delivered') and c.status in ('pending','exception')),
  'top_products',coalesce((select jsonb_agg(jsonb_build_object('product_name',ranked.product_name,'quantity_sold',ranked.quantity_sold,'gross_sales',ranked.gross_sales)) from (
   select coalesce(i.fulfilled_name,i.requested_name) product_name,sum(i.quantity)::bigint quantity_sold,
    sum(coalesce(i.final_unit_price,i.requested_unit_price)*i.quantity) gross_sales
   from public.order_items i join public.orders o on o.id=i.order_id where o.status='delivered' and o.completed_at>=v_start and o.completed_at<v_end
    and i.fulfillment_state in ('available','substituted') group by coalesce(i.fulfilled_name,i.requested_name) order by sum(i.quantity) desc,product_name limit 5
  ) ranked),'[]'::jsonb)
 ) into v_result;
 return v_result;
end $$;
revoke all on function public.admin_dashboard_metrics(date,date) from public,anon;
grant execute on function public.admin_dashboard_metrics(date,date) to authenticated;
