# Amar Bazar Admin Dashboard Setup

**Status:** local Phase 5 implementation; no dashboard or migration has been deployed.  
**App folder:** `apps/admin`  
**Backend:** the shared Supabase project described in `BACKEND_SETUP.md`.

## What is included

- Separate React + TypeScript + Vite web app. It does not share the Android app's navigation or session UI.
- Email/password sign-in through Supabase Auth. There is no public staff registration screen.
- Access is checked with `current_staff_roles()` on the server. No active role means access is denied; route visibility is not the security boundary.
- Role views for `admin`, `order_operator`, and `catalog_manager`.
- Orders overview, live new-order banner, search/filter, contact/address, item detail, quote verification, customer approval wait state, call-outcome logging, guarded order transitions, and cancellation reason.
- Product/category management, tracked-stock adjustments, notification history and admin-only retry, store settings and active-area fee overview.
- Admin WhatsApp messages are created in the order transaction's outbox. The worker sends them only when real Meta settings are configured and dry-run is explicitly disabled.
- Developer credit on the sign-in page and staff sidebar: **Shamsul Al Mazid · Statistics · Dhaka College**.

## Local preview

From `apps/admin`:

```powershell
Copy-Item .env.example .env
# Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for a local Supabase project.
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). To view only the unconfigured setup screen without connecting a backend, leave `.env` absent and run `pnpm dev`.

To preview the dashboard layout without Supabase, open `http://localhost:5173/?preview=1` or select **View demo preview** on the setup screen. This is a read-only design preview with clearly labelled fictional sample customers, orders, products, and totals. It never calls the backend or performs order actions. Return to `/` for the Supabase setup screen.

To create the static bundle locally:

```powershell
pnpm build
pnpm preview
```

Only the Supabase project URL and publishable key go in the browser environment. Do not add a service-role key, database password, Meta token, webhook secret, or worker secret to `apps/admin/.env` or any `VITE_*` variable.

## Backend migration and staff access

1. Apply `supabase/migrations/20261107000500_admin_dashboard_whatsapp.sql` to a **local/disposable** Supabase database after the existing migrations. No live project was linked or changed by Phase 5.
2. Create a staff Auth account through the trusted Supabase Auth administration flow. Public staff signup is not available in this UI.
3. Bootstrap the first owner/admin using the reviewed secure procedure in `BACKEND_SETUP.md` from a trusted local SQL editor. The first admin must be created by the project owner; the browser app has no unauthenticated role-grant flow.
4. Create an `app_private.admin_profiles` row and `app_private.user_roles` row for each approved staff account, using the least-privileged role. Never assign a role from customer-editable metadata.
5. Sign in with the provisioned email/password. The dashboard checks the active role before rendering any operational view.

The migration adds staff-readable notification rows and a restricted admin retry RPC. Orders, item snapshots and notification records remain protected by RLS. Order mutations call the authenticated `order-operations` Edge Function, which forwards the staff JWT to guarded database functions.

## Current limitations

- No live Supabase configuration, staff accounts, products, current-area fees, Meta business setup, or order history is included.
- `supabase/seed.sql` creates no products and intentionally sets `orders_enabled=false`; example delivery fees are unapproved.
- Product/category and order interfaces render empty states until local records are added.
- The dashboard does not provide a self-service staff invitation or role-management screen. Staff provisioning remains an owner-controlled Supabase operation.
- Image paths can be entered for products, but browser upload management is not included in this phase.
- Realtime new-order alerts require the migration's publication change and the connected Supabase Realtime service. Manual refresh is still available.
- Metrics use the most recent 100 orders returned by the bounded query. They are operational snapshot metrics, not an accounting report.
- `out_for_delivery` and `delivered` actions are staff-operated. There is no rider app/GPS, and marking delivery does not itself certify COD reconciliation.
- Full real order processing requires approved catalog/fees, configured Supabase Auth/Edge Functions, and backend migration verification. No fake records or success outcomes are generated.

## Review gate

This Phase 5 code is local only. Do not deploy the migration, configure Meta secrets, enable real notification sends, push a GitHub branch, or publish the dashboard until the owner has reviewed and approved those actions.
