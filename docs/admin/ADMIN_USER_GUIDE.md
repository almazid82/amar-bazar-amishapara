# Amar Bazar Admin Dashboard — User Guide

## What the dashboard connects to

The signed-in dashboard reads and writes the shared Supabase database. It does not use the fictional preview data for live operations. Customer checkout on the old root HTML website is still Local Storage based and is separate from this dashboard.

## Set up and open

1. Use a local Supabase stack or an isolated staging project with all ordered migrations applied, including `20261109000600_delivery_assignments.sql` and `20261110000700_admin_management.sql`.
2. Copy `apps/admin/.env.example` to `apps/admin/.env` and set only the project URL and publishable key for that same local/staging environment. Never put service-role or Meta keys in this file.
3. In a terminal, run:

   ```powershell
   cd apps/admin
   pnpm install
   pnpm dev
   ```

4. Open the local URL printed by Vite. Sign in with an existing Supabase Auth staff account. An account without an active backend role is denied dashboard access.
5. With no Supabase variables configured, the setup page has a clearly labelled read-only design preview. It contains fictional values and cannot change database records.

## Access roles

| Role | Dashboard access |
|---|---|
| `admin` | All operational views, business settings, staff role management, and audit history. |
| `order_operator` | Overview, orders, customer directory, delivery, COD, reports and notification review/retry as allowed by the database. |
| `catalog_manager` | Products, inventory, categories and shops. |

Role checks in the UI only control which screens are shown. Supabase RLS and database functions independently check every protected read/write. Do not share accounts. Use the backend bootstrap process in `BACKEND_SETUP.md` to establish the first admin in a disposable local database; do not grant admin to a customer account.

## Workflows

### Shops, categories and products

- Add a shop before adding products. Set a URL-safe slug and keep the shop inactive until its details are confirmed.
- Create categories, then add products with shop, category, price, unit, availability and stock-tracking choices.
- Product price is stored by the database. Price history is captured by the existing trigger.
- Product image uploads accept JPEG, PNG and WebP up to 5 MB into the `product-media` bucket. Storage policy permits only admin/catalog staff to upload. The uploaded object is public-read because catalog images are public. Use only product images suitable for public display.
- Deactivate products/shops to hide them. The dashboard does not offer destructive product or shop deletion.
- Inventory adjustment asks for a signed quantity delta and a reason. The database prevents stock below reserved quantity and writes a stock movement. “Low stock” in the dashboard means available quantity (`on hand - reserved`) at or below 5 units; this is a dashboard warning threshold, not a configured per-product policy.

### Orders and customer approval

1. For `pending_submission`, use **Confirm WhatsApp message received** only after staff sees the customer's manually sent message. Opening WhatsApp does not prove it was sent.
2. Review the customer request and requested item price snapshots.
3. Contact the shop, mark each line available, unavailable or substitute, set verified prices and delivery fee, then send the quote for customer approval.
4. Wait for explicit approval or record the phone outcome against the current quote version. The backend rejects stale quote versions.
5. Only confirmed orders can be prepared. Cancellation requires a reason in the dashboard and is validated again by the backend.
6. Every transition is checked against the allowed order state sequence. Order items preserve requested and final prices as historical snapshots.

### Delivery and COD

- Move a confirmed order to preparing, then assign a delivery person's name and E.164 phone number. Reassignment preserves the prior assignment row.
- The database blocks `out_for_delivery` unless an active assignment exists. It advances the assignment to in-transit/delivered/cancelled with the order transaction.
- COD rows are created when the customer approves the verified quote. Record the actual amount collected only while the order is out for delivery or delivered. The database checks it against the amount due and configured tolerance; it does not accept over-collection.

### Customers, reports and staff

- The customer directory is read-only. It returns name, phone, order count and most recent order through a protected paginated function; it does not expose customer address-book rows.
- Reports aggregate by Bangladesh calendar dates. Total orders are requests created in range; pending means awaiting shop/customer work; in progress means confirmed/preparing/out for delivery; completed and gross sales count delivered orders only; cancelled includes cancelled/rejected orders last updated in range; COD collected counts cash recorded in range; outstanding COD is the current unpaid balance on active/delivered orders; top products use delivered quantities in range.
- Staff management only assigns roles to existing Supabase Auth user IDs; it does not create or invite accounts. Deactivation disables the staff profile. Audit history stores actor, entity, action and changed field names, not old/new values or customer contact data.

## Data protection and recovery

- Customer names/phones/addresses and delivery-person phone numbers are visible only to authenticated operational roles permitted by RLS.
- Never enter real customer data into the fictional demo preview or development seed.
- Before each environment migration, check the project identity and have a current backup. Do not use `supabase db reset` on linked/staging/production projects.
- Keep WhatsApp secrets and Supabase service-role keys in server-side Edge Function secrets. The admin browser only receives the publishable key and user session.

## Known limits

- The dashboard depends on the SQL and Edge Function migrations having been applied to the same Supabase project as `.env`.
- There is no rider app or driver Auth role; delivery assignments are manually entered by staff.
- The old static customer website is not connected to this backend.
- No database integration, RLS, image upload or workflow acceptance test has been completed until local/staging credentials and a running database are supplied.
