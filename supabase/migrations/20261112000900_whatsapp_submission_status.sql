-- A WhatsApp handoff is only a draft until the customer presses Send and staff sees it.
alter type public.order_status add value if not exists 'pending_submission' before 'pending_verification';
