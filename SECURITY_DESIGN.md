# Amar Bazar Security Design

**Status:** security design for approval; no services configured.  
Security must be enforced in the database and server functions; hiding controls in a mobile/web UI is not authorization.

## 1. Secrets and environment separation

- Android and admin clients contain only Supabase project URL and publishable/anon key. Treat the publishable key as public; RLS protects data.
- Never include Supabase service-role/secret key, Meta access token, Meta App Secret, webhook verify token, database password, or signing keystore in source, `.env` committed to Git, app bundle, logs, or client configuration.
- Keep server secrets in Supabase Edge Function secrets or Vault; use separate development/staging/production projects and credentials.
- Rotate/revoke credentials after suspected exposure. Use least-privileged Meta system-user access and separate development/test phone number where available.
- Configure production allowlists, rate limits, CORS, and function authentication explicitly. CORS is not access control.

## 2. Authentication and role authorization

- Customers authenticate through Supabase Auth phone OTP. OTP confirms phone possession; order approval is a separate explicit decision bound to an order and quote version.
- Staff accounts are invite/provision only. The server inserts `user_roles`; users cannot assign roles through Auth metadata or profile updates.
- Roles: `admin` (owner/role and global configuration), `order_operator` (order verification and operations), `catalog_manager` (catalog/stock/area scope as approved). Enforce every role in Edge Function and database RPC.
- Consider MFA for owner/admin accounts before production. Remove access promptly on staff departure; record role changes.
- Use Auth JWT identity from `auth.uid()`; ignore body-supplied `customerId`, `actorId`, or role.

## 3. Row Level Security and grants

- Enable RLS on every exposed `public` table and Storage object policy. Review SQL grants as well as policies; revoke default broad table privileges where not needed.
- Customer order policies compare `customer_id` to `auth.uid()`; order-item/event policies check ownership through their parent order. Customers can select their orders but cannot directly insert/update/delete orders, items, status events, payments, stock, or decisions.
- Saved addresses permit CRUD only when `customer_id=auth.uid()`.
- Public reads expose only active shops/categories/products/areas and approved media fields. Never expose precise stock quantities, private shop contacts, internal notes, customer phone/address, or role data through catalog queries.
- Admin read and mutation permissions are role- and operation-specific. Critical mutations run only through functions that validate role and state, rather than broad direct `UPDATE` grants.
- Role helper functions live in an unexposed schema, use a fixed `search_path`, and cannot be called to mutate roles.
- Realtime subscriptions use the same RLS/ownership restrictions. Storage policies restrict write/delete to authorized catalog staff and constrain paths, file size, and MIME types.

## 4. Price, stock, checkout, and idempotency

- Client submits product identifiers, quantities, area ID, address and notes only. Server reads current product price, availability, fee, and any tracked inventory, then calculates all amounts using decimal arithmetic.
- Use database `CHECK` constraints and transaction functions to enforce nonnegative money, quantity limits, active area/product, valid state transitions, and order totals.
- Snapshot requested catalog details on order creation; record shop-verified values separately. Keep quote version and require it on customer approval to prevent approval of a stale total.
- Use a unique `(customer_id,idempotency_key)` constraint. Mobile retries reuse the same key; same key/different payload is rejected. Return the existing order for an identical retry.
- Lock the order and inventory rows during quote approval/reservation. Use conditional updates and a stock ledger. Never reserve/decrement from a client request.
- Protect against enumeration: random UUIDs/public codes are identifiers, not authorization; still require owner RLS.

## 5. PII and privacy controls

- Treat phone numbers, customer addresses, coordinates, notes and order histories as sensitive personal information. Collect only fields needed for fulfillment.
- Keep addresses in owner-scoped `customer_addresses`; copy a snapshot into an order for fulfillment/audit. Allow operational staff access only for assigned order purposes.
- Avoid putting phone/address/note data in URLs, analytics, push/WhatsApp logs, exception messages, or general app logs. Redact before logging and limit log retention.
- Do not store precise coordinates unless the user explicitly shares them. Provide manual address entry and a clear purpose statement.
- Establish a retention/deletion process for old addresses and orders with business/legal review; preserve only the minimum records needed for legitimate accounting/operational reasons.
- Use TLS for network traffic, database backups with access controls, and production data only in the production project.

## 6. Edge Function and webhook security

- Require a valid Supabase user JWT for customer/staff workflow functions. Platform JWT verification is only an initial check; handler and database still enforce owner/role permissions.
- For functions that call DB, preserve the user JWT where possible so RLS is applied. If a privileged worker uses service role, give it only internal task responsibilities and validate every claimed job/state transition.
- WhatsApp send function fetches recipient from the protected order record, verifies user opt-in, sends only approved transactional templates, and stores only necessary provider identifiers/results.
- Meta webhook POST: read raw request body; validate `X-Hub-Signature-256` with the configured App Secret using constant-time comparison; reject invalid signatures; deduplicate provider event/message IDs; validate payload shape and size before parsing/processing.
- Webhook verify token is only for GET challenge verification and is distinct from Meta App Secret and access token.
- Do not let a WhatsApp delivery/read webhook, user reply, or status field mutate order approval. Customer approval must be authenticated through the app (or an audited staff phone-call workflow).
- Rate-limit OTP requests, create-order, decision endpoints, and admin operations; cap input lengths, item counts, quantities, payload sizes, and pagination.

## 7. COD and operational security

- COD is an order payment method, not proof of payment. Status starts pending and is updated only by authorized staff after handover/collection.
- Record amount, actor, timestamp, order, and exception; enforce equality/tolerance rules and reconcile by delivery date/staff. Customer cannot mark payment collected.
- Do not reveal another customer's phone/address through the order queue or error responses. Staff dashboard should query only necessary operational data and log sensitive reads/mutations where feasible.
- No rider app exists in v1. If staff manually update `out_for_delivery`/`delivered`, require a role, valid transition and event record.

## 8. Threat cases and controls

| Threat | Control |
| --- | --- |
| Customer changes total or product price in app | Server-side product/area lookup, immutable snapshots, transaction recompute |
| Customer reads another order by guessing UUID | Owner RLS on order and all child queries |
| Customer self-assigns admin | Private role table, no client writes, owner-only staff-role function |
| Duplicate taps/network retries create duplicate orders | Idempotency key + unique database constraint |
| Concurrent approvals oversell tracked stock | Row lock/conditional reserve inside approval transaction |
| Admin marks order confirmed without customer approval | Guarded state transition checks recorded decision and quote version |
| Attacker forges WhatsApp webhook | Raw-body HMAC signature validation, deduplication, strict event allowlist |
| Secret leaks from app/repository | Server-only secret storage, secret scanning, rotation process |
| PII leaks in logs/analytics | Redaction, least-privilege access, limited retention, no PII in URLs |
| Stale area fee or product price | Effective-dated admin data, server calculation, visible final quote and customer approval |

## 9. Security verification gates

Before pilot, test customer vs customer reads, customer vs staff writes, role revocation, invalid/stale quote decisions, duplicate order retries, concurrent inventory reservation, invalid webhook signatures, duplicate webhook events, COD restrictions, and redaction in logs. These are future implementation gates, not tests run during this design phase.

## References

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/)

