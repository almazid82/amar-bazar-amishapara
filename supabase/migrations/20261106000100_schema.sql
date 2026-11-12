-- Amar Bazar initial database. Local/staging only until separately approved.
create extension if not exists pgcrypto with schema extensions;
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to anon,authenticated;

create type public.order_status as enum ('pending_verification','awaiting_customer_approval','confirmed','preparing','out_for_delivery','delivered','cancelled','rejected','expired');
create type public.customer_decision as enum ('pending','approved','changes_requested','rejected');
create type public.item_fulfillment as enum ('pending','available','unavailable','substituted');
create type app_private.staff_role as enum ('admin','order_operator','catalog_manager');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check (char_length(display_name)<=100),
 phone_e164 text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index profiles_phone_unique on public.profiles(phone_e164) where phone_e164 is not null;
create table app_private.admin_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(char_length(display_name)<=100), is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table app_private.user_roles (
 user_id uuid not null references auth.users(id) on delete cascade, role app_private.staff_role not null,
 assigned_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), primary key(user_id,role)
);
create index user_roles_user_idx on app_private.user_roles(user_id);

create function app_private.has_role(p_roles app_private.staff_role[])
returns boolean language sql stable security definer set search_path=pg_catalog,app_private,auth
as $$ select exists(select 1 from app_private.user_roles r join app_private.admin_profiles a using(user_id) where r.user_id=(select auth.uid()) and a.is_active and r.role=any(p_roles)); $$;
revoke all on function app_private.has_role(app_private.staff_role[]) from public,anon;
grant execute on function app_private.has_role(app_private.staff_role[]) to authenticated;
grant execute on function app_private.has_role(app_private.staff_role[]) to anon;

create table public.shops (
 id uuid primary key default gen_random_uuid(), name text not null check(char_length(name) between 1 and 120),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), description text, image_path text, phone_e164 text,
 is_active boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), parent_id uuid references public.categories(id) on delete set null,
 name text not null check(char_length(name) between 1 and 80), slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 sort_order integer not null default 0, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.products (
 id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id) on delete restrict,
 category_id uuid not null references public.categories(id) on delete restrict, sku text,
 name text not null check(char_length(name) between 1 and 160), description text, image_path text,
 unit_label text not null check(char_length(unit_label) between 1 and 50), price numeric(12,2) not null check(price>=0),
 currency char(3) not null default 'BDT' check(currency='BDT'), is_active boolean not null default false,
 is_available boolean not null default false, track_stock boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index products_shop_sku_unique on public.products(shop_id,sku) where sku is not null;
create index products_active_category_shop_idx on public.products(category_id,shop_id) where is_active and is_available;
create index products_shop_name_idx on public.products(shop_id,name);
create table public.product_price_history (
 id bigint generated always as identity primary key, product_id uuid not null references public.products(id) on delete restrict,
 old_price numeric(12,2) not null check(old_price>=0), new_price numeric(12,2) not null check(new_price>=0),
 changed_by uuid references auth.users(id) on delete set null, changed_at timestamptz not null default now(), reason text
);
create table public.product_inventory (
 product_id uuid primary key references public.products(id) on delete restrict,
 on_hand integer not null check(on_hand>=0), reserved integer not null default 0 check(reserved>=0 and reserved<=on_hand),
 updated_at timestamptz not null default now()
);
create table public.delivery_areas (
 id uuid primary key default gen_random_uuid(), name text not null check(char_length(name) between 1 and 100),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), fee numeric(12,2) not null check(fee>=0),
 currency char(3) not null default 'BDT' check(currency='BDT'), is_active boolean not null default false,
 effective_from timestamptz, effective_until timestamptz, sort_order integer not null default 0,
 updated_by uuid references auth.users(id) on delete set null, updated_at timestamptz not null default now(),
 check(effective_until is null or effective_from is null or effective_until>effective_from)
);
create index delivery_areas_active_sort_idx on public.delivery_areas(is_active,sort_order);
create table public.store_settings (
 id boolean primary key default true check(id), display_name text not null default 'Amar Bazar',
 currency char(3) not null default 'BDT' check(currency='BDT'), support_phone text, support_whatsapp_url text,
 orders_enabled boolean not null default false, cod_enabled boolean not null default true,
 cod_tolerance numeric(12,2) not null default 0 check(cod_tolerance>=0), max_order_items integer not null default 30 check(max_order_items between 1 and 100),
 updated_by uuid references auth.users(id) on delete set null, updated_at timestamptz not null default now()
);

create table public.customer_addresses (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references auth.users(id) on delete cascade,
 label text not null default 'Home' check(char_length(label) between 1 and 60), recipient_name text not null check(char_length(recipient_name) between 1 and 100),
 phone_e164 text not null check(phone_e164 ~ '^\+[1-9][0-9]{7,14}$'), area_id uuid not null references public.delivery_areas(id) on delete restrict,
 address_line text not null check(char_length(address_line) between 1 and 500), landmark text,
 latitude numeric(9,6), longitude numeric(9,6), is_default boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);
create index customer_addresses_owner_default_idx on public.customer_addresses(customer_id,is_default);
create table public.customer_notification_preferences (
 customer_id uuid primary key references auth.users(id) on delete cascade, whatsapp_order_updates boolean not null default false,
 consent_source text, consent_at timestamptz, revoked_at timestamptz, updated_at timestamptz not null default now(),
 check(not whatsapp_order_updates or (consent_at is not null and revoked_at is null))
);

create table public.orders (
 id uuid primary key default gen_random_uuid(), public_code text not null unique,
 customer_id uuid not null references auth.users(id) on delete restrict, idempotency_key uuid not null, request_hash bytea not null,
 status public.order_status not null default 'pending_verification', customer_decision public.customer_decision not null default 'pending',
 area_id uuid not null references public.delivery_areas(id) on delete restrict, area_name_snapshot text not null,
 recipient_name_snapshot text not null, phone_snapshot text not null check(phone_snapshot ~ '^\+[1-9][0-9]{7,14}$'),
 address_snapshot text not null, landmark_snapshot text, latitude numeric(9,6), longitude numeric(9,6), customer_note text,
 estimated_subtotal numeric(12,2) not null check(estimated_subtotal>=0), estimated_delivery_fee numeric(12,2) not null check(estimated_delivery_fee>=0),
 estimated_total numeric(12,2) not null check(estimated_total>=0), final_subtotal numeric(12,2) check(final_subtotal is null or final_subtotal>=0),
 final_delivery_fee numeric(12,2) check(final_delivery_fee is null or final_delivery_fee>=0), final_total numeric(12,2) check(final_total is null or final_total>=0),
 quote_version integer not null default 0 check(quote_version>=0), estimated_eta text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), confirmed_at timestamptz, completed_at timestamptz, cancelled_at timestamptz,
 unique(customer_id,idempotency_key), check((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);
create index orders_customer_created_idx on public.orders(customer_id,created_at desc);
create index orders_status_created_idx on public.orders(status,created_at);
create table public.order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict,
 product_id uuid references public.products(id) on delete set null, shop_id uuid references public.shops(id) on delete set null,
 requested_name text not null, requested_unit_label text not null, requested_unit_price numeric(12,2) not null check(requested_unit_price>=0),
 quantity integer not null check(quantity between 1 and 99), fulfillment_state public.item_fulfillment not null default 'pending',
 fulfilled_product_id uuid references public.products(id) on delete set null, fulfilled_name text, final_unit_price numeric(12,2) check(final_unit_price is null or final_unit_price>=0),
 created_at timestamptz not null default now()
);
create unique index order_items_order_product_unique on public.order_items(order_id,product_id) where product_id is not null;
create index order_items_order_idx on public.order_items(order_id);
create table public.order_item_checks (
 id uuid primary key default gen_random_uuid(), order_item_id uuid not null references public.order_items(id) on delete restrict,
 checked_by uuid not null references auth.users(id) on delete restrict, result public.item_fulfillment not null,
 verified_unit_price numeric(12,2) check(verified_unit_price is null or verified_unit_price>=0),
 alternative_product_id uuid references public.products(id) on delete set null, alternative_name text, note text,
 checked_at timestamptz not null default now()
);
create index order_item_checks_item_date_idx on public.order_item_checks(order_item_id,checked_at desc);
create table public.order_contact_attempts (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict,
 quote_version integer not null check(quote_version>=0), attempted_by uuid not null references auth.users(id) on delete restrict,
 channel text not null default 'phone' check(channel='phone'),
 outcome text not null check(outcome in ('no_answer','callback_requested','approved','changes_requested','rejected')),
 note text, attempted_at timestamptz not null default now()
);
create index order_contact_attempts_order_idx on public.order_contact_attempts(order_id,attempted_at desc);
create table public.order_events (
 id bigint generated always as identity primary key, order_id uuid not null references public.orders(id) on delete restrict,
 event_type text not null, from_status public.order_status, to_status public.order_status not null,
 actor_user_id uuid references auth.users(id) on delete set null, source text not null check(source in ('customer_app','admin','system','phone_call')),
 reason text, created_at timestamptz not null default now()
);
create index order_events_order_date_idx on public.order_events(order_id,created_at);
create table public.order_status_history (
 id bigint generated always as identity primary key, order_id uuid not null references public.orders(id) on delete restrict,
 from_status public.order_status, to_status public.order_status not null,
 actor_user_id uuid references auth.users(id) on delete set null, source text not null check(source in ('customer_app','admin','system','phone_call')),
 note text, created_at timestamptz not null default now()
);
create index order_status_history_order_date_idx on public.order_status_history(order_id,created_at);
create table public.customer_order_decisions (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict,
 customer_id uuid not null references auth.users(id) on delete restrict, quote_version integer not null check(quote_version>0),
 decision public.customer_decision not null check(decision in ('approved','changes_requested','rejected')),
 source text not null check(source in ('app','phone_call')), recorded_by uuid references auth.users(id) on delete set null,
 note text, created_at timestamptz not null default now(), unique(order_id,quote_version)
);
create index customer_order_decisions_customer_idx on public.customer_order_decisions(customer_id,created_at desc);
create table public.cod_payments (
 id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete restrict,
 status text not null default 'pending' check(status in ('pending','collected','exception','refunded')),
 amount_due numeric(12,2) not null check(amount_due>=0), amount_collected numeric(12,2) not null default 0 check(amount_collected>=0),
 collected_by uuid references auth.users(id) on delete set null, collected_at timestamptz, note text, updated_at timestamptz not null default now(),
 check(status<>'collected' or (collected_at is not null and collected_by is not null))
);
create table public.stock_movements (
 id bigint generated always as identity primary key, product_id uuid not null references public.products(id) on delete restrict,
 order_id uuid references public.orders(id) on delete restrict, actor_user_id uuid references auth.users(id) on delete set null,
 movement_type text not null check(movement_type in ('adjustment','reserve','release','sale','return')),
 quantity_delta integer not null check(quantity_delta<>0), created_at timestamptz not null default now(), reason text
);
create index stock_movements_product_date_idx on public.stock_movements(product_id,created_at desc);
create index stock_movements_order_idx on public.stock_movements(order_id);

create table public.notification_outbox (
 id uuid primary key default gen_random_uuid(), order_event_id bigint not null references public.order_events(id) on delete restrict,
 order_id uuid not null references public.orders(id) on delete restrict, event_type text not null,
 channel text not null default 'whatsapp' check(channel='whatsapp'), template_name text not null,
 status text not null default 'pending' check(status in ('pending','processing','sent','retry','dead_letter','unknown','skipped')),
 attempt_count integer not null default 0 check(attempt_count>=0), next_attempt_at timestamptz not null default now(),
 locked_by text, lease_until timestamptz, provider_message_id text, last_error_code text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(order_event_id,channel)
);
create index notification_outbox_ready_idx on public.notification_outbox(status,next_attempt_at) where status in ('pending','retry');
create table public.notification_logs (
 id bigint generated always as identity primary key, outbox_id uuid not null references public.notification_outbox(id) on delete restrict,
 attempt_number integer not null check(attempt_number>0), outcome text not null check(outcome in ('sent','retry','dead_letter','unknown','skipped','delivered','read','failed')),
 provider_message_id text, provider_error_code text, created_at timestamptz not null default now()
);
create table public.notification_webhook_events (
 id bigint generated always as identity primary key, provider_event_key text not null unique,
 provider_message_id text, event_type text not null, received_at timestamptz not null default now(), processed_at timestamptz
);

create function app_private.touch_updated_at() returns trigger language plpgsql set search_path=pg_catalog
as $$ begin new.updated_at:=now(); return new; end $$;
create function app_private.sync_auth_profile() returns trigger language plpgsql security definer set search_path=pg_catalog,public
as $$ begin
 insert into public.profiles(id,display_name,phone_e164) values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',''),100),new.phone)
 on conflict(id) do update set phone_e164=excluded.phone_e164,updated_at=now(); return new;
end $$;
create trigger auth_profile_after_insert after insert on auth.users for each row execute function app_private.sync_auth_profile();
create trigger auth_phone_after_update after update of phone on auth.users for each row when(old.phone is distinct from new.phone) execute function app_private.sync_auth_profile();
create function app_private.audit_product_price() returns trigger language plpgsql security definer set search_path=pg_catalog,public,auth
as $$ begin if old.price is distinct from new.price then insert into public.product_price_history(product_id,old_price,new_price,changed_by,reason) values(old.id,old.price,new.price,auth.uid(),'catalog price update'); end if; return new; end $$;
create trigger products_price_audit after update of price on public.products for each row execute function app_private.audit_product_price();
do $$ declare t text; begin foreach t in array array['profiles','shops','categories','products','product_inventory','delivery_areas','store_settings','customer_addresses','customer_notification_preferences','orders','cod_payments','notification_outbox'] loop execute format('create trigger %I_touch_updated_at before update on public.%I for each row execute function app_private.touch_updated_at()',t,t); end loop; end $$;

-- Enable RLS on every Data API table, including backend-only tables.
do $$ declare t text; begin foreach t in array array['profiles','shops','categories','products','product_price_history','product_inventory','delivery_areas','store_settings','customer_addresses','customer_notification_preferences','orders','order_items','order_item_checks','order_contact_attempts','order_events','order_status_history','customer_order_decisions','cod_payments','stock_movements','notification_outbox','notification_logs','notification_webhook_events'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
alter table app_private.admin_profiles enable row level security;
alter table app_private.user_roles enable row level security;

create policy shops_read on public.shops for select to anon,authenticated using(is_active or app_private.has_role(array['admin','order_operator','catalog_manager']::app_private.staff_role[]));
create policy categories_read on public.categories for select to anon,authenticated using(is_active or app_private.has_role(array['admin','order_operator','catalog_manager']::app_private.staff_role[]));
create policy products_read on public.products for select to anon,authenticated using((is_active and is_available) or app_private.has_role(array['admin','order_operator','catalog_manager']::app_private.staff_role[]));
create policy areas_read on public.delivery_areas for select to anon,authenticated using(is_active or app_private.has_role(array['admin']::app_private.staff_role[]));
create policy store_settings_read on public.store_settings for select to anon,authenticated using(true);
create policy profiles_select_own on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy addresses_owner_all on public.customer_addresses for all to authenticated using(customer_id=(select auth.uid())) with check(customer_id=(select auth.uid()));
create policy notification_preferences_owner_read on public.customer_notification_preferences for select to authenticated using(customer_id=(select auth.uid()));
create policy orders_owner_or_operator_read on public.orders for select to authenticated using(customer_id=(select auth.uid()) or app_private.has_role(array['admin','order_operator']::app_private.staff_role[]));
create policy items_owner_or_operator_read on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.customer_id=(select auth.uid()) or app_private.has_role(array['admin','order_operator']::app_private.staff_role[]))));
create policy status_owner_or_operator_read on public.order_status_history for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.customer_id=(select auth.uid()) or app_private.has_role(array['admin','order_operator']::app_private.staff_role[]))));
create policy events_staff_read on public.order_events for select to authenticated using(app_private.has_role(array['admin','order_operator']::app_private.staff_role[]));
create policy decisions_owner_or_operator_read on public.customer_order_decisions for select to authenticated using(customer_id=(select auth.uid()) or app_private.has_role(array['admin','order_operator']::app_private.staff_role[]));
create policy item_checks_staff_read on public.order_item_checks for select to authenticated using(app_private.has_role(array['admin','order_operator']::app_private.staff_role[]));
create policy contact_attempts_staff_read on public.order_contact_attempts for select to authenticated using(app_private.has_role(array['admin','order_operator']::app_private.staff_role[]));
create policy cod_staff_read on public.cod_payments for select to authenticated using(app_private.has_role(array['admin','order_operator']::app_private.staff_role[]));
create policy inventory_staff_read on public.product_inventory for select to authenticated using(app_private.has_role(array['admin','catalog_manager','order_operator']::app_private.staff_role[]));
create policy price_history_staff_read on public.product_price_history for select to authenticated using(app_private.has_role(array['admin','catalog_manager']::app_private.staff_role[]));
create policy stock_movements_staff_read on public.stock_movements for select to authenticated using(app_private.has_role(array['admin','catalog_manager','order_operator']::app_private.staff_role[]));

revoke all on all tables in schema public from anon,authenticated;
revoke all on all sequences in schema public from anon,authenticated;
grant select(id,name,slug,description,image_path,is_active) on public.shops to anon,authenticated;
grant select(id,parent_id,name,slug,sort_order,is_active) on public.categories to anon,authenticated;
grant select(id,shop_id,category_id,name,description,image_path,unit_label,price,currency,is_active,is_available,created_at,updated_at) on public.products to anon,authenticated;
grant select(id,name,slug,fee,currency,is_active,effective_from,effective_until,sort_order) on public.delivery_areas to anon,authenticated;
grant select(id,display_name,currency,support_phone,support_whatsapp_url,orders_enabled,cod_enabled,updated_at) on public.store_settings to anon,authenticated;
grant select(id,display_name,phone_e164,created_at,updated_at) on public.profiles to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant select,insert,update,delete on public.customer_addresses to authenticated;
grant select(customer_id,whatsapp_order_updates,consent_source,consent_at,revoked_at,updated_at) on public.customer_notification_preferences to authenticated;
grant select(id,public_code,customer_id,status,customer_decision,area_id,area_name_snapshot,recipient_name_snapshot,phone_snapshot,address_snapshot,landmark_snapshot,latitude,longitude,customer_note,estimated_subtotal,estimated_delivery_fee,estimated_total,final_subtotal,final_delivery_fee,final_total,quote_version,estimated_eta,created_at,updated_at,confirmed_at,completed_at,cancelled_at) on public.orders to authenticated;
grant select(id,order_id,product_id,shop_id,requested_name,requested_unit_label,requested_unit_price,quantity,fulfillment_state,fulfilled_product_id,fulfilled_name,final_unit_price,created_at) on public.order_items to authenticated;
grant select(id,order_id,from_status,to_status,source,created_at) on public.order_status_history to authenticated;
grant select(id,order_id,event_type,from_status,to_status,source,created_at) on public.order_events to authenticated;
grant select(id,order_id,customer_id,quote_version,decision,source,created_at) on public.customer_order_decisions to authenticated;
grant select on public.order_item_checks,public.order_contact_attempts,public.cod_payments,public.product_inventory,public.product_price_history,public.stock_movements to authenticated;
revoke all on public.notification_outbox,public.notification_logs,public.notification_webhook_events from anon,authenticated;
revoke all on all tables in schema app_private from anon,authenticated;
grant usage on type public.order_status,public.customer_decision,public.item_fulfillment to anon,authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
