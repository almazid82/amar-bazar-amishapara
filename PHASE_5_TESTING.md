# Phase 5 Review and Testing Guide

## Local dashboard

From `apps/admin`:

```powershell
Copy-Item .env.example .env
# Configure only a local Supabase URL and publishable key.
pnpm install --frozen-lockfile
pnpm dev
```

Open Vite's printed local URL. With `.env` missing, the dashboard should show its backend setup screen. With local Supabase configured but no session, it should show secure sign-in. A normal customer account must be denied after login because it has no staff role.

## Local build check

```powershell
pnpm build
```

This runs TypeScript project build and a Vite production bundle. It does not verify Supabase authorization or Meta message delivery.

## Staff-account acceptance checks

Use only a disposable local Supabase database and local staff accounts:

1. Anonymous visitor sees sign-in, not order/customer data.
2. Customer Auth account cannot get a staff role; after sign-in the UI denies access.
3. `order_operator` can see order queue/customer data needed to call, verify quote, record phone outcome, transition allowed states and see notifications; cannot change store settings or catalog.
4. `catalog_manager` can manage product/category/stock screens but cannot access order queue or settings.
5. `admin` can access all dashboard modules and retry eligible notifications.
6. A customer cannot call `order-operations` with admin actions: RLS/function RPC returns forbidden.
7. A customer cannot read notification outbox/logs. An unauthorized authenticated user cannot retry any notification.

## Order workflow checks

1. Create a local test customer, active product, shop, category, delivery area and COD-enabled store setting. Enable order requests **only in local**.
2. Submit an order through the customer app and confirm the database contains one order, initial estimate, event and exactly one admin outbox row for that order event.
3. Retry the same customer request with the same idempotency key: it must resolve to the existing order rather than create another order/alert.
4. Sign in to the dashboard as order operator. Search/filter and open the request; confirm contact, area/address, product snapshot and total are visible only to staff.
5. Save a verified quote with a changed/unavailable/substitute line and fee. Confirm status becomes `awaiting_customer_approval`, quote version increments, and prep/delivery buttons are unavailable.
6. Approve in the customer app or record a phone outcome using the current quote version. Confirm a stale quote version fails, and only explicit approval can reach `confirmed`.
7. Move through `preparing` → `out_for_delivery` → `delivered`; try an invalid transition and verify the database rejects it.
8. Cancel an eligible order with a reason; verify backend state/stock-release safeguards. Verify delivered/cancelled terminal orders cannot be cancelled/reopened through UI.

## Product, stock and settings checks

- Product/category changes use `order-operations` RPC actions; customer/anonymous direct writes fail.
- Toggle product active/available and verify public catalog behavior.
- Enable tracked stock; adjust with a nonzero quantity and reason. Verify the inventory ledger records the actor and reason; reject a negative stock state below reservations.
- COD/settings update is admin-only and validated server-side. Do not switch `orders_enabled` on in live pilot until owner confirms catalog, fees, staff coverage, COD and cancellation process.

## Notification checks (dry-run first)

1. Keep `WHATSAPP_DRY_RUN=true`; create a local test order.
2. Invoke the protected worker using the local worker secret. Confirm job becomes `skipped` with `DRY_RUN_NO_MESSAGE_SENT`, an attempt log exists, and **no Meta request was made**.
3. Confirm the order remains `pending_verification`; notification handling must not confirm/cancel/block it.
4. Check customer messages are not sent without current customer opt-in; the worker records `NO_CURRENT_OPT_IN`.
5. Retry is admin-only and only available for eligible dead-letter/skipped statuses. `unknown` must not be blindly resent.
6. For later live test, use a Meta-approved template and opted-in test recipient in the dedicated test environment. Verify Meta accepted response, provider ID, delivery webhook signature/deduplication, retry/backoff and dead-letter handling. Do not use real customer addresses/numbers without explicit operational authorization.

## Current verification status

- React/TypeScript admin app was built locally and a production Vite bundle was generated successfully in this session.
- Database migrations, RLS, Edge Functions, Auth roles, realtime order alerts, and the order/WhatsApp lifecycle have **not** been executed against a local Supabase instance in this environment.
- No real Meta credential, approved template, admin recipient, webhook, scheduled worker or external message was configured/tested.
- No Android device preview or screenshot is part of Phase 5; the deliverable is a responsive web admin dashboard. A local browser screenshot should be captured once a local preview session is started.
- Do not deploy or publish based on a successful frontend build alone.
