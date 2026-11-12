-- Phase 5: staff authorization helpers, notification visibility/retry, and admin WhatsApp outbox.
alter table public.notification_outbox add column recipient_type text not null default 'customer'
  check (recipient_type in ('customer','admin'));
alter table public.notification_outbox drop constraint if exists notification_outbox_order_event_id_channel_key;
create unique index notification_outbox_event_channel_recipient_uidx
  on public.notification_outbox(order_event_id,channel,recipient_type);

create or replace function app_private.enqueue_event(p_event bigint,p_order uuid,p_kind text)
returns void language plpgsql security definer set search_path=pg_catalog,public
as $$
declare v_template text;
begin
  v_template:=case p_kind when 'order_received' then 'order_received' when 'quote_ready' then 'quote_ready'
    when 'order_confirmed' then 'order_confirmed' when 'order_preparing' then 'order_preparing'
    when 'order_out_for_delivery' then 'order_out_for_delivery' when 'order_delivered' then 'order_delivered'
    when 'order_cancelled' then 'order_cancelled' else null end;
  if v_template is null then return; end if;

  -- Every committed new order gets one staff alert, regardless of customer messaging consent.
  -- The recipient number is resolved from an Edge Function secret, never from a client or database row.
  if p_kind='order_received' then
    insert into public.notification_outbox(order_event_id,order_id,event_type,channel,template_name,recipient_type)
    values(p_event,p_order,p_kind,'whatsapp','admin_new_order','admin')
    on conflict(order_event_id,channel,recipient_type) do nothing;
  end if;

  -- Customer order messages require current, explicit opt-in.
  if exists(select 1 from public.orders o join public.customer_notification_preferences n using(customer_id)
    where o.id=p_order and n.whatsapp_order_updates and n.consent_at is not null and n.revoked_at is null) then
    insert into public.notification_outbox(order_event_id,order_id,event_type,channel,template_name,recipient_type)
    values(p_event,p_order,p_kind,'whatsapp',v_template,'customer')
    on conflict(order_event_id,channel,recipient_type) do nothing;
  end if;
end $$;
revoke all on function app_private.enqueue_event(bigint,uuid,text) from public,anon,authenticated;

create or replace function public.current_staff_roles()
returns text[] language sql stable security definer set search_path=pg_catalog,public,app_private,auth
as $$
  select coalesce(array_agg(r.role::text order by r.role::text),array[]::text[])
  from app_private.user_roles r join app_private.admin_profiles a using(user_id)
  where r.user_id=auth.uid() and a.is_active
$$;
revoke all on function public.current_staff_roles() from public,anon;
grant execute on function public.current_staff_roles() to authenticated;

create function public.admin_retry_notification(p_outbox_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
begin
  if auth.uid() is null or not app_private.has_role(array['admin']::app_private.staff_role[]) then
    raise exception using errcode='42501',message='FORBIDDEN';
  end if;
  update public.notification_outbox set status='retry',next_attempt_at=now(),last_error_code=null,
    locked_by=null,lease_until=null,updated_at=now()
  where id=p_outbox_id and status in ('dead_letter','skipped');
  if not found then raise exception using errcode='P0001',message='NOTIFICATION_NOT_RETRYABLE'; end if;
end $$;
revoke all on function public.admin_retry_notification(uuid) from public,anon;
grant execute on function public.admin_retry_notification(uuid) to authenticated;

create policy notifications_staff_read on public.notification_outbox for select to authenticated
  using(app_private.has_role(array['admin','order_operator']::app_private.staff_role[]));
create policy notification_logs_staff_read on public.notification_logs for select to authenticated
  using(exists(select 1 from public.notification_outbox n where n.id=outbox_id
    and app_private.has_role(array['admin','order_operator']::app_private.staff_role[])));
grant select on public.notification_outbox,public.notification_logs to authenticated;

-- Staff can inspect inactive catalog rows and the inventory flag; RLS still excludes customers.
grant select(sku,track_stock) on public.products to authenticated;
grant select on public.product_inventory to authenticated;

-- Staff alert processing and live order queue use RLS-protected records.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
     and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notification_outbox') then
    alter publication supabase_realtime add table public.notification_outbox;
  end if;
end $$;
