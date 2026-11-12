# Amar Bazar — Database Architecture

**Backend decision:** reuse the existing Supabase Postgres schema, migrations, RLS and RPC/Edge Function workflow. No second database or API service is proposed.

## Environment layout

Use the same version-controlled migration sequence for three isolated environments:

| Environment | Database | Data | Purpose |
|---|---|---|---|
| Local development | Local Supabase stack via Supabase CLI/Docker, when available | Synthetic seed only | Developer work, migration validation, repeatable automated checks |
| Staging | Separate Supabase project | Synthetic customers, shops, catalog, orders | End-to-end, role/RLS, integration and release-candidate tests |
| Production | Separate Supabase project, region chosen before launch | Real customers/orders only | Live service |

Do not share a database between staging and production. Projects are environment boundaries, not duplicate backends: each runs the same Amar Bazar schema and functions. If the budget cannot sustain a paid staging project, use local Supabase for routine work and an explicitly short-lived/free staging project with no real data; remember free projects may pause and lack managed backups.

## Existing schema domains

Object inventory below is based on the migrations in `supabase/migrations/`; verify exact deployed schema before relying on it.

| Domain | Existing tables / objects | Ownership and use |
|---|---|---|
| Roles | `app_private.admin_profiles`, `app_private.user_roles`, `current_staff_roles()` | Backend-managed staff role assignments; never accepted from client claims alone |
| Shops/catalog | `shops`, `categories`, `products`, `product_inventory`, `product_price_history` | Active product/price/availability and stock; public reads limited by RLS; edits via checked admin/catalog RPCs |
| Service areas/settings | `delivery_areas`, `store_settings` | Current delivery fee/effective dates and ordering/COD toggles |
| Customer | `profiles`, `customer_addresses`, `customer_notification_preferences` | Owner-scoped profile/address and consent records |
| Orders | `orders`, `order_items`, `order_item_checks`, `order_contact_attempts`, `customer_order_decisions`, `order_events`, `order_status_history` | Request snapshots, shop verification, customer approval, state timeline and audit context |
| Fulfillment/COD | `stock_movements`, `cod_payments` | Reservation/sale/release ledger and amount due/collected record |
| Messaging | `notification_outbox`, `notification_logs`, `notification_webhook_events` | Idempotent queued notification, provider outcome and signed callback history |
| Storage | `product-media` bucket | Public read for listed product images; writes restricted to authorized catalog roles |

## Data authority and boundaries

- A client submits **product IDs and quantities**, not trusted prices, totals, inventory counts or order statuses.
- `create_order` reads the active price/area fee from Postgres, captures snapshots, validates business rules, uses a unique customer-scoped idempotency key and writes order/event/outbox in one transaction.
- Quote verification locks the order, checks `quote_version`, stores each line decision and recomputes the final total from staff-supplied verified line prices plus the selected delivery fee.
- Customer approval is scoped to the order owner and current quote version. Approval rechecks/reserves stock and creates COD due in one transaction.
- Status changes follow an allowed transition graph. Delivered/cancelled states settle or release inventory; COD is recorded with an exception path for amount mismatch.
- Notification worker uses server-only service credentials for its narrow job; notification failure must not roll back an order.

## Access pattern by role

| Actor | Read | Write |
|---|---|---|
| Anonymous visitor | Published shops/categories/products/areas and public store settings | No live orders, customer data or business-table mutation |
| Authenticated customer | Own profile, addresses, own orders/items/history/decisions | Own address/profile, consent; order/quote decisions through approved RPC/function paths |
| `order_operator` | Orders/items/history, verification/contact/notification and operational inventory views | Quote checks, call outcomes, permitted state transitions, COD and retry operations through checked function paths |
| `catalog_manager` | Catalog, shops/categories, inventory and stock movement views | Catalog/shop/category/stock operations through role-checked RPCs |
| `admin` | Authorized operational and configuration data | Staff role assignment, delivery areas, store settings plus order/catalog actions |
| Service worker | Specific outbox/order context needed to send a message | Claim/complete/retry records and webhook event recording through restricted service-only RPCs |

RLS and SQL `security definer` functions are high-impact controls. Every security-definer function must retain a fixed `search_path`, check `auth.uid()` and role/ownership explicitly, and have minimal execute grants. Current source appears to follow this pattern in key paths, but it has not been run against Supabase; test all policies and grants in staging.

## Migration/versioning policy

1. Keep one forward-only migration file per reviewed schema change in `supabase/migrations/`.
2. Never edit a migration already applied to staging/production; create a new migration to correct it.
3. Review migration diff, grants, RLS, indexes, lock impact and rollback plan before merge.
4. Apply to local first, then staging; compare schema and exercise automated tests; production follows an explicit release approval.
5. Use seed data only in local/staging. Ensure `supabase/seed.sql` cannot overwrite live data and is not applied to production by default.

## Data retention and backups

- Keep orders/status and financial records according to the owner-approved operational/accounting retention policy; retain only needed phone/address data.
- Product image object data is not restored solely by a Postgres backup; back up Storage objects separately.
- Keep a database backup separate from GitHub and the production project. Restrict access and encrypt at rest.
- Propose daily Supabase managed backups on the production plan, plus periodic off-site logical dump and a documented restore drill. Confirm Storage/media recovery separately.
- Do not confuse Git history (source/schema) with database/data backups.

## Known evidence gaps

There is no verified remote project, applied migration record, database backup status, actual database region, production Auth provider, RLS test result or Storage restore test. Treat each as **UNVERIFIED** until observed in the intended project.
