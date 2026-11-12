-- Authorized catalog/configuration operations. No direct table mutations are granted to app users.
create function public.admin_upsert_shop(
 p_id uuid,p_name text,p_slug text,p_description text default null,p_image_path text default null,p_phone text default null,p_active boolean default false
) returns uuid language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
declare v_id uuid:=coalesce(p_id,gen_random_uuid());
begin
 if auth.uid() is null or not app_private.has_role(array['admin','catalog_manager']::app_private.staff_role[]) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 if nullif(btrim(coalesce(p_name,'')),'') is null or char_length(p_name)>120 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  or char_length(coalesce(p_description,''))>2000 or char_length(coalesce(p_image_path,''))>500
  or (p_phone is not null and p_phone !~ '^\+[1-9][0-9]{7,14}$') then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 insert into public.shops(id,name,slug,description,image_path,phone_e164,is_active)
 values(v_id,btrim(p_name),p_slug,nullif(btrim(coalesce(p_description,'')),''),p_image_path,p_phone,p_active)
 on conflict(id) do update set name=excluded.name,slug=excluded.slug,description=excluded.description,image_path=excluded.image_path,phone_e164=excluded.phone_e164,is_active=excluded.is_active;
 return v_id;
end $$;

create function public.admin_upsert_category(p_id uuid,p_parent_id uuid,p_name text,p_slug text,p_sort_order integer default 0,p_active boolean default true)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
declare v_id uuid:=coalesce(p_id,gen_random_uuid());
begin
 if auth.uid() is null or not app_private.has_role(array['admin','catalog_manager']::app_private.staff_role[]) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 if nullif(btrim(coalesce(p_name,'')),'') is null or char_length(p_name)>80 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or p_sort_order not between -100000 and 100000
  or p_id=p_parent_id then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 insert into public.categories(id,parent_id,name,slug,sort_order,is_active) values(v_id,p_parent_id,btrim(p_name),p_slug,p_sort_order,p_active)
 on conflict(id) do update set parent_id=excluded.parent_id,name=excluded.name,slug=excluded.slug,sort_order=excluded.sort_order,is_active=excluded.is_active;
 return v_id;
end $$;

create function public.admin_upsert_product(
 p_id uuid,p_shop_id uuid,p_category_id uuid,p_sku text,p_name text,p_description text,p_image_path text,
 p_unit_label text,p_price numeric,p_active boolean,p_available boolean,p_track_stock boolean
) returns uuid language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
declare v_id uuid:=coalesce(p_id,gen_random_uuid()); v_old_track boolean; v_reserved integer;
begin
 if auth.uid() is null or not app_private.has_role(array['admin','catalog_manager']::app_private.staff_role[]) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 if p_shop_id is null or p_category_id is null or nullif(btrim(coalesce(p_name,'')),'') is null or char_length(p_name)>160
  or nullif(btrim(coalesce(p_unit_label,'')),'') is null or char_length(p_unit_label)>50 or p_price is null or p_price<0
  or char_length(coalesce(p_sku,''))>80 or char_length(coalesce(p_description,''))>2000 or char_length(coalesce(p_image_path,''))>500 then
  raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 if not exists(select 1 from public.shops where id=p_shop_id) or not exists(select 1 from public.categories where id=p_category_id) then
  raise exception using errcode='P0001',message='REFERENCE_NOT_FOUND'; end if;
 select track_stock into v_old_track from public.products where id=v_id for update;
 if found and v_old_track and not p_track_stock then
  select reserved into v_reserved from public.product_inventory where product_id=v_id;
  if coalesce(v_reserved,0)>0 then raise exception using errcode='P0001',message='STOCK_RESERVED'; end if;
 end if;
 insert into public.products(id,shop_id,category_id,sku,name,description,image_path,unit_label,price,currency,is_active,is_available,track_stock)
 values(v_id,p_shop_id,p_category_id,nullif(p_sku,''),btrim(p_name),nullif(btrim(coalesce(p_description,'')),''),p_image_path,btrim(p_unit_label),p_price,'BDT',p_active,p_available,p_track_stock)
 on conflict(id) do update set shop_id=excluded.shop_id,category_id=excluded.category_id,sku=excluded.sku,name=excluded.name,
 description=excluded.description,image_path=excluded.image_path,unit_label=excluded.unit_label,price=excluded.price,
 is_active=excluded.is_active,is_available=excluded.is_available,track_stock=excluded.track_stock;
 if p_track_stock then insert into public.product_inventory(product_id,on_hand,reserved) values(v_id,0,0) on conflict(product_id) do nothing; end if;
 return v_id;
end $$;

create function public.admin_upsert_delivery_area(p_id uuid,p_name text,p_slug text,p_fee numeric,p_active boolean,p_from timestamptz default null,p_until timestamptz default null,p_sort integer default 0)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
declare v_id uuid:=coalesce(p_id,gen_random_uuid());
begin
 if auth.uid() is null or not app_private.has_role(array['admin']::app_private.staff_role[]) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 if nullif(btrim(coalesce(p_name,'')),'') is null or char_length(p_name)>100 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  or p_fee is null or p_fee<0 or (p_until is not null and p_from is not null and p_until<=p_from) then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 insert into public.delivery_areas(id,name,slug,fee,currency,is_active,effective_from,effective_until,sort_order,updated_by)
 values(v_id,btrim(p_name),p_slug,p_fee,'BDT',p_active,p_from,p_until,p_sort,auth.uid())
 on conflict(id) do update set name=excluded.name,slug=excluded.slug,fee=excluded.fee,is_active=excluded.is_active,
 effective_from=excluded.effective_from,effective_until=excluded.effective_until,sort_order=excluded.sort_order,updated_by=auth.uid();
 return v_id;
end $$;

create function public.admin_update_store_settings(
 p_display_name text,p_support_phone text,p_whatsapp_url text,p_orders_enabled boolean,p_cod_enabled boolean,p_cod_tolerance numeric,p_max_items integer
) returns void language plpgsql security definer set search_path=pg_catalog,public,app_private,auth
as $$
begin
 if auth.uid() is null or not app_private.has_role(array['admin']::app_private.staff_role[]) then raise exception using errcode='42501',message='FORBIDDEN'; end if;
 if nullif(btrim(coalesce(p_display_name,'')),'') is null or char_length(p_display_name)>120
  or (p_support_phone is not null and p_support_phone !~ '^\+[1-9][0-9]{7,14}$')
  or (p_whatsapp_url is not null and p_whatsapp_url !~ '^https://(wa\.me|api\.whatsapp\.com)/')
  or p_cod_tolerance is null or p_cod_tolerance<0 or p_max_items not between 1 and 100 then raise exception using errcode='22023',message='INVALID_INPUT'; end if;
 insert into public.store_settings(id,display_name,currency,support_phone,support_whatsapp_url,orders_enabled,cod_enabled,cod_tolerance,max_order_items,updated_by)
 values(true,btrim(p_display_name),'BDT',p_support_phone,p_whatsapp_url,p_orders_enabled,p_cod_enabled,p_cod_tolerance,p_max_items,auth.uid())
 on conflict(id) do update set display_name=excluded.display_name,support_phone=excluded.support_phone,support_whatsapp_url=excluded.support_whatsapp_url,
 orders_enabled=excluded.orders_enabled,cod_enabled=excluded.cod_enabled,cod_tolerance=excluded.cod_tolerance,max_order_items=excluded.max_order_items,updated_by=auth.uid();
end $$;

revoke all on function public.admin_upsert_shop(uuid,text,text,text,text,text,boolean) from public,anon;
grant execute on function public.admin_upsert_shop(uuid,text,text,text,text,text,boolean) to authenticated;
revoke all on function public.admin_upsert_category(uuid,uuid,text,text,integer,boolean) from public,anon;
grant execute on function public.admin_upsert_category(uuid,uuid,text,text,integer,boolean) to authenticated;
revoke all on function public.admin_upsert_product(uuid,uuid,uuid,text,text,text,text,text,numeric,boolean,boolean,boolean) from public,anon;
grant execute on function public.admin_upsert_product(uuid,uuid,uuid,text,text,text,text,text,numeric,boolean,boolean,boolean) to authenticated;
revoke all on function public.admin_upsert_delivery_area(uuid,text,text,numeric,boolean,timestamptz,timestamptz,integer) from public,anon;
grant execute on function public.admin_upsert_delivery_area(uuid,text,text,numeric,boolean,timestamptz,timestamptz,integer) to authenticated;
revoke all on function public.admin_update_store_settings(text,text,text,boolean,boolean,numeric,integer) from public,anon;
grant execute on function public.admin_update_store_settings(text,text,text,boolean,boolean,numeric,integer) to authenticated;

-- Approved catalog images are public to read, but only privileged catalog staff can write them.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-media','product-media',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy product_media_read on storage.objects for select to anon,authenticated using(bucket_id='product-media');
create policy product_media_insert on storage.objects for insert to authenticated
with check(bucket_id='product-media' and app_private.has_role(array['admin','catalog_manager']::app_private.staff_role[]));
create policy product_media_update on storage.objects for update to authenticated
using(bucket_id='product-media' and app_private.has_role(array['admin','catalog_manager']::app_private.staff_role[]))
with check(bucket_id='product-media' and app_private.has_role(array['admin','catalog_manager']::app_private.staff_role[]));
create policy product_media_delete on storage.objects for delete to authenticated
using(bucket_id='product-media' and app_private.has_role(array['admin','catalog_manager']::app_private.staff_role[]));

