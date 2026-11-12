-- Admin-only reporting, staff/customer directory RPCs, and non-PII audit history.
-- Additive migration; no existing application records are removed or rewritten.

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_type text not null,
  entity_id text not null,
  changed_fields text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log(created_at desc);
create index admin_audit_log_entity_idx on public.admin_audit_log(entity_type, entity_id, created_at desc);
alter table public.admin_audit_log enable row level security;
create policy admin_audit_log_admin_read on public.admin_audit_log
  for select to authenticated using (app_private.has_role(array['admin']::app_private.staff_role[]));
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;
grant all on public.admin_audit_log to service_role;
grant all on sequence public.admin_audit_log_id_seq to service_role;
-- Shop contact numbers are business contact details; expose only on rows already
-- allowed by the shops RLS policy (active shops or authorized catalog staff).
grant select(phone_e164) on public.shops to authenticated;

create function app_private.capture_admin_audit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, app_private, auth
as $$
declare
  v_old jsonb := '{}'::jsonb;
  v_new jsonb := '{}'::jsonb;
  v_action text := lower(tg_op);
  v_changed text[];
  v_entity_id text;
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
  else
    v_old := to_jsonb(old);
    v_new := v_old;
  end if;

  select coalesce(array_agg(n.key order by n.key), array[]::text[])
    into v_changed
    from jsonb_each(v_new) as n(key, value)
   where n.key not in ('created_at', 'updated_at')
     and (v_old -> n.key) is distinct from n.value;

  v_entity_id := coalesce(v_new ->> 'id', v_new ->> 'user_id', v_new ->> 'product_id', v_new ->> 'order_id', 'unknown');
  insert into public.admin_audit_log(actor_user_id, action, entity_type, entity_id, changed_fields)
  values (auth.uid(), v_action, tg_table_schema || '.' || tg_table_name, v_entity_id, v_changed);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function app_private.capture_admin_audit() from public, anon, authenticated;

create trigger shops_admin_audit after insert or update or delete on public.shops
  for each row execute function app_private.capture_admin_audit();
create trigger categories_admin_audit after insert or update or delete on public.categories
  for each row execute function app_private.capture_admin_audit();
create trigger products_admin_audit after insert or update or delete on public.products
  for each row execute function app_private.capture_admin_audit();
create trigger product_inventory_admin_audit after insert or update or delete on public.product_inventory
  for each row execute function app_private.capture_admin_audit();
create trigger delivery_areas_admin_audit after insert or update or delete on public.delivery_areas
  for each row execute function app_private.capture_admin_audit();
create trigger store_settings_admin_audit after insert or update or delete on public.store_settings
  for each row execute function app_private.capture_admin_audit();
create trigger orders_admin_audit after update of status, customer_decision, final_subtotal, final_delivery_fee, final_total on public.orders
  for each row execute function app_private.capture_admin_audit();
create trigger delivery_records_admin_audit after insert or update or delete on public.delivery_records
  for each row execute function app_private.capture_admin_audit();
create trigger cod_payments_admin_audit after insert or update or delete on public.cod_payments
  for each row execute function app_private.capture_admin_audit();
create trigger staff_profiles_admin_audit after insert or update or delete on app_private.admin_profiles
  for each row execute function app_private.capture_admin_audit();
create trigger staff_roles_admin_audit after insert or update or delete on app_private.user_roles
  for each row execute function app_private.capture_admin_audit();

create function public.admin_list_customers(p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns table(customer_id uuid, display_name text, phone_e164 text, order_count bigint, latest_order_at timestamptz)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, app_private, auth
as $$
begin
  if auth.uid() is null or not app_private.has_role(array['admin','order_operator']::app_private.staff_role[]) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if char_length(coalesce(p_search, '')) > 160 or p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset < 0 then
    raise exception using errcode = '22023', message = 'INVALID_INPUT';
  end if;
  return query
  select p.id, p.display_name, p.phone_e164, count(o.id), max(o.created_at)
    from public.profiles p
    left join public.orders o on o.customer_id = p.id
   where p_search is null or p_search = '' or p.display_name ilike '%' || p_search || '%'
      or p.phone_e164 ilike '%' || p_search || '%'
   group by p.id, p.display_name, p.phone_e164
   order by max(o.created_at) desc nulls last, p.display_name
   limit p_limit offset p_offset;
end;
$$;
revoke all on function public.admin_list_customers(text, integer, integer) from public, anon;
grant execute on function public.admin_list_customers(text, integer, integer) to authenticated;

create function public.admin_list_staff()
returns table(user_id uuid, email text, display_name text, role text, is_active boolean, assigned_at timestamptz)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, app_private, auth
as $$
begin
  if auth.uid() is null or not app_private.has_role(array['admin']::app_private.staff_role[]) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  return query
  select a.user_id, u.email::text, a.display_name, r.role::text, a.is_active, r.created_at
    from app_private.admin_profiles a
    join auth.users u on u.id = a.user_id
    left join app_private.user_roles r on r.user_id = a.user_id
   order by a.display_name, r.role;
end;
$$;
revoke all on function public.admin_list_staff() from public, anon;
grant execute on function public.admin_list_staff() to authenticated;

create function public.admin_dashboard_metrics(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, app_private, auth
as $$
declare
  v_result jsonb;
  v_start timestamptz;
  v_end timestamptz;
begin
  if auth.uid() is null or not app_private.has_role(array['admin','order_operator']::app_private.staff_role[]) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception using errcode = '22023', message = 'INVALID_INPUT';
  end if;
  v_start := p_from::timestamp at time zone 'Asia/Dhaka';
  v_end := (p_to + 1)::timestamp at time zone 'Asia/Dhaka';

  select jsonb_build_object(
    'total_orders', (select count(*) from public.orders o where o.created_at >= v_start and o.created_at < v_end),
    'pending_orders', (select count(*) from public.orders o where o.created_at >= v_start and o.created_at < v_end and o.status in ('pending_verification','awaiting_customer_approval')),
    'in_progress_orders', (select count(*) from public.orders o where o.created_at >= v_start and o.created_at < v_end and o.status in ('confirmed','preparing','out_for_delivery')),
    'completed_orders', (select count(*) from public.orders o where o.completed_at >= v_start and o.completed_at < v_end and o.status = 'delivered'),
    'cancelled_orders', (select count(*) from public.orders o where o.updated_at >= v_start and o.updated_at < v_end and o.status in ('cancelled','rejected')),
    'gross_sales', (select coalesce(sum(o.final_total), 0) from public.orders o where o.completed_at >= v_start and o.completed_at < v_end and o.status = 'delivered'),
    'cod_collected', (select coalesce(sum(c.amount_collected), 0) from public.cod_payments c where c.collected_at >= v_start and c.collected_at < v_end and c.status in ('collected','exception')),
    'outstanding_cod', (select coalesce(sum(greatest(c.amount_due - c.amount_collected, 0)), 0) from public.cod_payments c join public.orders o on o.id = c.order_id where o.status in ('out_for_delivery','delivered') and c.status in ('pending','exception')),
    'top_products', coalesce((
      select jsonb_agg(jsonb_build_object('product_name', ranked.product_name, 'quantity_sold', ranked.quantity_sold, 'gross_sales', ranked.gross_sales))
      from (
        select coalesce(i.fulfilled_name, i.requested_name) as product_name,
               sum(i.quantity)::bigint as quantity_sold,
               sum(coalesce(i.final_unit_price, i.requested_unit_price) * i.quantity) as gross_sales
          from public.order_items i join public.orders o on o.id = i.order_id
         where o.status = 'delivered' and o.completed_at >= v_start and o.completed_at < v_end
           and i.fulfillment_state in ('available','substituted')
         group by coalesce(i.fulfilled_name, i.requested_name)
         order by sum(i.quantity) desc, product_name
         limit 5
      ) ranked
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.admin_dashboard_metrics(date, date) from public, anon;
grant execute on function public.admin_dashboard_metrics(date, date) to authenticated;
