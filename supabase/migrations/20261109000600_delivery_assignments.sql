-- Add manual delivery assignment history for the pilot (there is no rider app yet).
-- Forward-only and additive: no existing order, payment, or inventory rows are changed.

create table public.delivery_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  driver_name text not null check (char_length(btrim(driver_name)) between 1 and 100),
  driver_phone_e164 text not null check (driver_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  status text not null default 'assigned'
    check (status in ('assigned', 'in_transit', 'delivered', 'reassigned', 'cancelled')),
  notes text check (notes is null or char_length(notes) <= 500),
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((status in ('delivered', 'reassigned', 'cancelled')) = (completed_at is not null))
);

create index delivery_records_order_history_idx
  on public.delivery_records(order_id, assigned_at desc);
create unique index delivery_records_one_active_per_order_idx
  on public.delivery_records(order_id)
  where status in ('assigned', 'in_transit');

alter table public.delivery_records enable row level security;
create policy delivery_records_staff_read on public.delivery_records
  for select to authenticated
  using (app_private.has_role(array['admin','order_operator']::app_private.staff_role[]));
revoke all on public.delivery_records from anon, authenticated;
grant select on public.delivery_records to authenticated;
grant all on public.delivery_records to service_role;

create trigger delivery_records_touch_updated_at
  before update on public.delivery_records
  for each row execute function app_private.touch_updated_at();

create function public.assign_order_delivery(
  p_order_id uuid,
  p_driver_name text,
  p_driver_phone_e164 text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private, auth
as $$
declare
  v_order public.orders%rowtype;
  v_record public.delivery_records%rowtype;
begin
  if auth.uid() is null or not app_private.has_role(array['admin','order_operator']::app_private.staff_role[]) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if p_order_id is null
     or nullif(btrim(coalesce(p_driver_name, '')), '') is null
     or char_length(p_driver_name) > 100
     or p_driver_phone_e164 is null
     or p_driver_phone_e164 !~ '^\+[1-9][0-9]{7,14}$'
     or char_length(coalesce(p_notes, '')) > 500 then
    raise exception using errcode = '22023', message = 'INVALID_INPUT';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'ORDER_NOT_FOUND';
  end if;
  if v_order.status not in ('confirmed', 'preparing') then
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
  end if;

  update public.delivery_records
     set status = 'reassigned', completed_at = now()
   where order_id = p_order_id and status = 'assigned';

  insert into public.delivery_records(order_id, driver_name, driver_phone_e164, notes, assigned_by)
  values (p_order_id, btrim(p_driver_name), p_driver_phone_e164, nullif(btrim(p_notes), ''), auth.uid())
  returning * into v_record;

  return jsonb_build_object(
    'deliveryId', v_record.id,
    'orderId', v_record.order_id,
    'status', v_record.status,
    'assignedAt', v_record.assigned_at
  );
end;
$$;
revoke all on function public.assign_order_delivery(uuid, text, text, text) from public, anon;
grant execute on function public.assign_order_delivery(uuid, text, text, text) to authenticated;

-- Do not permit dispatch until a current driver assignment has been recorded.
create function app_private.require_delivery_assignment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'out_for_delivery' and old.status is distinct from new.status
     and not exists (
       select 1 from public.delivery_records d
       where d.order_id = new.id and d.status = 'assigned'
     ) then
    raise exception using errcode = 'P0001', message = 'DELIVERY_ASSIGNMENT_REQUIRED';
  end if;
  return new;
end;
$$;
revoke all on function app_private.require_delivery_assignment() from public, anon, authenticated;
create trigger orders_require_delivery_assignment
  before update of status on public.orders
  for each row execute function app_private.require_delivery_assignment();

-- Keep the assignment timeline aligned with the canonical order state transaction.
create function app_private.sync_delivery_record_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'out_for_delivery' then
    update public.delivery_records
       set status = 'in_transit'
     where order_id = new.id and status = 'assigned';
  elsif new.status = 'delivered' then
    update public.delivery_records
       set status = 'delivered', completed_at = now()
     where order_id = new.id and status = 'in_transit';
  elsif new.status in ('cancelled', 'rejected', 'expired') then
    update public.delivery_records
       set status = 'cancelled', completed_at = now()
     where order_id = new.id and status in ('assigned', 'in_transit');
  end if;
  return new;
end;
$$;
revoke all on function app_private.sync_delivery_record_status() from public, anon, authenticated;
create trigger orders_sync_delivery_record_status
  after update of status on public.orders
  for each row execute function app_private.sync_delivery_record_status();
