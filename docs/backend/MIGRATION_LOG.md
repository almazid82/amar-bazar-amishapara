# Migration log

Migrations are ordered by filename and are the checked-in schema history. **Execution state:** none was run against a live project in this task; deployed migration parity remains unverified.

| Migration | Purpose from source | Safety / status |
|---|---|---|
| `20261106000100_schema.sql` | Core enums, private staff roles, profiles, shops, catalog, inventory, delivery areas, settings, addresses, orders, order details/history, COD, stock movement, notifications, RLS and grants | Initial schema. Do not apply to a database with unknown state without migration-history and schema review. Existing migration, not executed here. |
| `20261106000200_order_workflows.sql` | Event/outbox helpers, order creation, price/stock/area checks, quote, approval/decision, contact outcome, status transitions, COD, role and inventory functions, notification worker functions and grants | Uses transactional PostgreSQL functions and authorization checks. Existing migration, not executed here. |
| `20261106000300_catalog_admin.sql` | Staff catalog/shop/area/settings upserts and `product-media` storage bucket/policies | Existing migration, not executed here. |
| `20261106000400_customer_realtime.sql` | Realtime publication for order status/customer order surfaces | Existing migration, not executed here. |
| `20261107000500_admin_dashboard_whatsapp.sql` | Dashboard staff role query, event notification enqueue/retry policies and staff notification reads | Existing migration, not executed here. |
| `20261109000600_delivery_assignments.sql` | Add delivery assignment/history table, staff-only read RLS, assignment RPC, and order-state triggers that require/advance/close assignment | Additive: creates new table/indexes/functions/triggers and does not delete or rewrite existing rows. Static review only; SQL execution and rollback behavior unverified. |
| `20261112000900_whatsapp_submission_status.sql` | Add `pending_submission` for an order draft created before WhatsApp handoff | Additive enum value only. Not applied or tested against a database. |
| `20261112001000_whatsapp_order_drafts.sql` | Add idempotent server-side WhatsApp draft creation, staff transition after receipt, customer draft cancellation, and include drafts in pending metrics | Uses existing validated order transaction; removes the normal order-received outbox entry within the same transaction. Static review only; apply and test on isolated staging before use. |

## New migration behavior

- No existing data is updated during migration.
- One current assignment per order is enforced by a partial unique index; completed/reassigned/cancelled history is preserved.
- Assignment RPC locks the target order and accepts only `confirmed`/`preparing` orders. It stores the assigning authenticated staff user.
- `out_for_delivery` is blocked unless an `assigned` record exists. Subsequent order status updates synchronize the delivery record in the same database transaction.
- Driver contact data is staff-only. Clients can only invoke the RPC after authentication; the RPC checks the `admin`/`order_operator` role.
- Avoid destructive rollback after real assignment records exist. If rollout must be reversed, first stop dispatch via a reviewed forward migration and retain history; do not drop the table/data as routine rollback.

## Environment rollout checklist

1. Capture/verify a database backup and confirm target project is local or staging, not production.
2. Inspect migration history and current schema. Do not use `db reset` against linked/remote projects.
3. Run the migration on a disposable local Supabase stack; inspect SQL errors and generated schema.
4. Run positive and negative RLS/role tests, assignment and dispatch tests, transaction rollback and concurrent assignment tests.
5. Apply the identical migration file to isolated staging, then test Edge Function invocation with synthetic users.
6. Only after separate owner approval and production migration plan, apply to production with backup/recovery plan.

## Environment configuration change

`supabase/functions/.env.example` now lists `SUPABASE_PUBLISHABLE_KEY` for the existing user-JWT client helper. It is a public project key and is distinct from `SUPABASE_SERVICE_ROLE_KEY`. No actual value was added or read.

## Verification record for this task

- `supabase`, Docker, PostgreSQL client (`psql`) and Deno were not available in this environment at inspection time.
- No Supabase URL/key `.env` or authorized development project connection was available.
- Therefore no migration, CRUD, Auth, RLS, transaction, or unauthorized-access test was run. This is a tool/configuration blocker, not a pass.
