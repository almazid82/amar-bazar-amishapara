# Row Level Security and backend security

**Review type:** Static inspection of checked-in migrations and callers. Runtime policies have not been tested against a database.

## Read-access matrix in source

| Data | Anonymous | Customer | Order operator/admin | Catalog manager | Service worker |
|---|---|---|---|---|---|
| Active shops/categories/products/areas and store settings | Narrow public columns | Same | Public + operational allowed columns | Catalog columns | Server access |
| Profile | None | Own row | Own row only via profile policy | Own row | Server access |
| Address | None | Own rows | No general address-table policy; order snapshots are operational read | None | Server access |
| Order and items | None | Own orders/items | Operational orders/items | None | Server access |
| Status history and customer decisions | None | Own order history/decision rows | Operational read | None | Server access |
| Quote checks, phone attempts, COD, inventory, price/stock history | None | None | Role-scoped reads where policy permits | Catalog/inventory role-scoped reads | Server access |
| `delivery_records` | None | None | Admin/order-operator select | None | Server access |
| Outbox/logs/webhook events | None | None | Staff-select policy for outbox/logs; webhook rows are private | None | Server-only writes/reads |
| Private role tables | None | None | Not directly exposed | Not directly exposed | Security-definer helpers only |

Direct table writes for orders and internal workflows are revoked from anon/authenticated. The role-checked security-definer RPCs are the intended mutation interface. Storage product media is publicly readable; writes are role-checked by storage policies.

## Required controls

- Keep RLS enabled on every exposed table, including new tables. Add narrow grants in addition to policies; RLS does not replace SQL privileges.
- Any `SECURITY DEFINER` function must have a fixed `search_path`, least required grants, explicit caller/role checks, bounded inputs, and a review of every table it can mutate. New delivery RPC/triggers follow this pattern.
- User-supplied prices, totals, roles, statuses, stock and notification outcomes are never authoritative.
- Use order row locks, idempotency/unique constraints and quote version checks for concurrency-sensitive mutations.
- Separate customer PII from public reads. Driver name/phone in `delivery_records` is sensitive operational data; no customer or catalog role gets a direct read grant/policy.
- Notification secrets and service-role credentials remain server-side. Webhook messages require signature verification; internal worker requests require separate authentication.
- Restrict CORS from current wildcard to known customer/admin origins before production browser integration. CORS is not authorization.
- Static website Local Storage and demo admin preview are not secure backend storage and must not handle real orders or PII.

## Explicit negative tests required in local/staging

1. Anonymous attempts to insert/update orders, items, inventory, COD, delivery records, notifications and private roles are denied.
2. Customer A cannot read Customer B's profile, addresses, orders, line items, history or decisions, and cannot invoke staff functions.
3. An authenticated customer cannot assign a driver, set prices/roles/status, adjust inventory, collect COD or retry notifications.
4. Catalog manager cannot quote or transition orders, assign delivery, collect COD or assign staff.
5. Order operator cannot manage staff roles or edit catalog outside explicitly authorized operations.
6. Revoked staff token cannot continue authorized operations after role removal; validate Auth/JWT caching behavior.
7. Dispatch without an active delivery record fails; duplicate concurrent assignment attempts leave only one active record; reassign/deliver/cancel history remains consistent.
8. Service-role operations are unavailable to all client bundles and cannot be accessed via public routes.

These negative tests were not executable without a local/staging Postgres and synthetic Auth sessions. No RLS/security acceptance test is reported as passed.
