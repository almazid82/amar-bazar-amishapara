-- Allow a customer to cancel only before order confirmation.
-- Does not touch stock: stock is reserved only after an approved quote.
create function public.customer_cancel_order(p_order_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private, auth
as $$
declare
  v_order public.orders%rowtype;
  v_event bigint;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if char_length(coalesce(p_reason, '')) > 300 then
    raise exception using errcode = '22023', message = 'INVALID_INPUT';
  end if;
  select * into v_order
    from public.orders
   where id = p_order_id and customer_id = auth.uid()
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'ORDER_NOT_FOUND';
  end if;
  if v_order.status not in ('pending_verification', 'awaiting_customer_approval') then
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
  end if;
  update public.orders
     set status = 'cancelled', customer_decision = case when v_order.status = 'awaiting_customer_approval' then 'rejected'::public.customer_decision else customer_decision end,
         cancelled_at = now()
   where id = p_order_id;
  v_event := app_private.add_event(p_order_id, 'order_cancelled', v_order.status, 'cancelled', auth.uid(), 'customer_app', p_reason);
  perform app_private.enqueue_event(v_event, p_order_id, 'order_cancelled');
  return jsonb_build_object('orderId', p_order_id, 'status', 'cancelled');
end;
$$;
revoke all on function public.customer_cancel_order(uuid, text) from public, anon;
grant execute on function public.customer_cancel_order(uuid, text) to authenticated;
