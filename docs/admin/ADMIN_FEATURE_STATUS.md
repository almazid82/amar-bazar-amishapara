# Admin Dashboard — Feature and Verification Status

**Implementation status:** dashboard code and additive backend migrations are present in the repository. **Runtime/acceptance status:** not approved or verified against a database. Never treat code presence as proof of live integration.

## Feature status

| Module | Status in source | Backend path | Runtime acceptance |
|---|---|---|---|
| Secure staff login / role gate | Implemented | Supabase Auth and `current_staff_roles()` | Not run against Auth |
| Overview | Implemented with server aggregates and recent order queue | `admin_dashboard_metrics()` and RLS order reads | Blocked until migration/database is available |
| Products | Create/edit/activate/deactivate, price and availability changes | `order-operations` → `admin_upsert_product` | Not tested against database |
| Product image upload | Implemented, MIME/5 MB client guard plus bucket policy | Supabase Storage `product-media` | Not tested against Storage/RLS |
| Categories | Create/edit/visibility/order | `admin_upsert_category` | Not tested against database |
| Shops | Create/edit/activate/deactivate | `admin_upsert_shop` | Not tested against database |
| Inventory | Stock adjustment, available/on-hand/reserved display, movement history, low-stock warning at ≤5 available | `record_inventory_adjustment`, `product_inventory`, `stock_movements` | Not tested against concurrent stock or permissions |
| Orders | Search/filter/detail, customer contact, requested/verified prices, quote/approval state, totals, cancellation reason and restricted transitions | RLS reads; `order-operations` and transactional RPCs | No real order was submitted or processed |
| Customer directory | Read-only search and pagination; PII-limited fields | `admin_list_customers()` | Not tested against RLS/authorization |
| Delivery | Assign/reassign person; dispatch and completion; history | `assign_order_delivery()` and order transition triggers | Not tested against transaction/assignment constraints |
| COD | Amount due/collected/balance, controlled collection action | `record_cod_collection()` and RLS records | Not tested against payment safeguards |
| Reports | Bangladesh-date totals, status counts, gross sales, COD and top products | `admin_dashboard_metrics()` | Not tested against known fixtures or database totals |
| Staff / roles | List current roles, assign role to existing Auth ID, deactivate profile | `admin_list_staff()` and `assign_staff_role()` | Not tested with role matrix |
| Admin audit | Field-name-only audit for catalog, stock, settings, staff, order state, delivery and COD | Triggered `admin_audit_log` | Not tested against migration/runtime |
| Notifications | Existing outbox/log review and admin retry | Existing RLS and notification RPCs | Not tested with Meta or worker |
| Business settings | Existing authorized store and delivery settings | `admin_update_store_settings()` and area upsert | Not tested against database |

## Verification performed in this workspace

- Admin TypeScript project build/type-check: **PASS** (`tsc -b`, 2026-11-10).
- Vite production bundle build: **PASS** (`vite build`, 74 modules, 2026-11-10).
- Git whitespace/conflict-marker check (`git diff --check`): **PASS**; only existing line-ending normalization warnings were reported.
- Automated unit/integration test suite: **NOT AVAILABLE**; `apps/admin/package.json` defines no test or lint script and the dashboard has no test files.
- Browser UI acceptance: **NOT VERIFIED**; the previous local browser preview could not connect to the running local page, so no screenshot-based interaction check is claimed.
- SQL migration source inspection: performed; not parsed/executed by PostgreSQL.
- Supabase CLI, Docker, PostgreSQL client and Deno: **UNAVAILABLE** in this environment; no Supabase or database environment variable names are present.
- Database connectivity, CRUD, image upload, Auth, RLS, role denial, audit triggers, transactional stock/order behavior and COD: **NOT RUN**.
- No live project was inspected, migrated, seeded, or modified. No production records were used.

## Required acceptance gate

Use an isolated local/staging database with synthetic accounts and catalog data. Apply the ordered migrations (without resetting or linking production), then verify:

1. Admin/catalog/order-operator access boundaries and unauthorized customer/anonymous access denial.
2. Product/category/shop CRUD and valid image upload plus invalid type/oversize rejection.
3. Inventory adjustment audit history, reserved-stock protection and concurrent update behavior.
4. Quote price/fee update, explicit customer approval, order status transitions and cancellation history.
5. Delivery assignment requirement, reassignment, dispatch, completion and rollback on failed transition.
6. COD exact/partial/over-collection behavior and outstanding balance.
7. Customer search pagination and cross-customer privacy.
8. Analytics totals checked against seeded fixtures in Bangladesh time.
9. Staff assignment/deactivation and audit rows; confirm catalog managers/operators cannot see admin-only staff/audit data.

Phase 3 is **not accepted** until this gate passes and the owner reviews/approves the dashboard. Do not proceed to Phase 4.
