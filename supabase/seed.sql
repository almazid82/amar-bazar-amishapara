-- Development-only reference data. These sample fees are not approved for production.
insert into public.store_settings (id, display_name, currency, orders_enabled, cod_enabled, cod_tolerance, max_order_items)
values (true, 'Amar Bazar (Development)', 'BDT', false, true, 0, 30)
on conflict (id) do nothing;

insert into public.delivery_areas (name, slug, fee, currency, is_active, sort_order)
values
  ('Amishapara', 'amishapara', 50, 'BDT', true, 1),
  ('Amultoli', 'amultoli', 60, 'BDT', true, 2),
  ('Bachairgaon', 'bachairgaon', 70, 'BDT', true, 3),
  ('Barahipur', 'barahipur', 120, 'BDT', true, 4),
  ('Dhanpur', 'dhanpur', 100, 'BDT', true, 5),
  ('Noagaon', 'noagaon', 120, 'BDT', true, 6),
  ('Paniyashala', 'paniyashala', 60, 'BDT', true, 7),
  ('Satbaria', 'satbaria', 100, 'BDT', true, 8)
on conflict (slug) do nothing;

-- No products, customers, or staff accounts are seeded.
