-- Realtime is an optional acceleration; RLS-protected reads remain authoritative.
do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='orders') then
      alter publication supabase_realtime add table public.orders;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='order_status_history') then
      alter publication supabase_realtime add table public.order_status_history;
    end if;
  end if;
end $$;
