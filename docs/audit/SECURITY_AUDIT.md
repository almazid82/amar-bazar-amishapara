# Amar Bazar — Phase 0 Security Audit

**Method:** Static source/configuration review plus syntax/type/build checks. This is not a penetration test. No live credentials, user records, or production database were accessed.

## Positive controls found in source

- Client examples use Supabase publishable keys, not service-role keys. No local `.env` files were present.
- Customer order Edge Function validates a bearer-authenticated user, UUID idempotency key, item identifiers and quantities, address/phone formats and request length before invoking the database operation.
- Database order creation derives current price and area fee from database rows, snapshots order details, checks active shops/products/categories, and uses an idempotency key scoped to the customer.
- Database functions use explicit authorization checks for staff-only quote, transition, COD, catalog, stock and store-setting actions. Direct writes are revoked from anon/authenticated where shown; privileged actions are exposed through checked functions.
- RLS policies scope profiles and addresses to the authenticated owner and orders/items/history to the owner or authorized operator roles. Notification tables are restricted to staff policies.
- Notification secrets are read server-side. The worker authenticates an internal secret, defaults to dry-run, checks customer notification consent, uses approved template messages, records retry outcomes and avoids sending from the mobile client.
- WhatsApp webhook POST validates the Meta HMAC SHA-256 signature and bounds its request body.
- Dynamic customer fields in the root prototype's order rendering are passed through `escapeHTML` in inspected templates; nevertheless localStorage remains fully editable by that browser user.

## Risks / gaps requiring resolution

| Severity | Finding | Evidence / impact |
|---|---|---|
| High | Root staff preview is not an authenticated admin system | `app.js` has an `adminOpen` handler and operates on shared `localStorage`; do not use for real customer data or order fulfillment. |
| High | Root checkout is not server-authoritative | Client-created prices, totals, order status, and local records can be altered/deleted. It is labelled demo, but must remain explicitly non-operational. |
| High | Production controls cannot be verified | No local env, live project, migration status, RLS execution test, or deployed Edge Function evidence was available. |
| Medium | Pages workflow publishes repository root without a build/artifact allowlist | `.github/workflows/deploy.yml` uploads `.`. Review the intended public artifact if internal dashboard/backend directories are committed later. No secret values were exposed in this audit. |
| Medium | Web client bundle inherently exposes publishable keys | Expected for Supabase; security depends on correctly deployed RLS and server-side function checks, which are not yet runtime-tested. |
| Medium | Auth hardening was not verified | Admin UI uses email/password. MFA, lockout/rate limits, staff account lifecycle, session duration and credential recovery were not validated. |
| Medium | Customer phone/address/location are sensitive | Supabase schemas and owner RLS are designed to restrict data, but access boundaries need automated and manual staging tests. Root localStorage has weaker privacy and same-origin exposure. |
| Medium | Dependency advisory status not established | No lockfile audit or registry advisory check was completed in this phase; avoid claiming dependencies are vulnerability-free. |
| Low | Webhook GET uses ordinary token equality | GET verification token comparison in source is not constant-time. POST signature path uses HMAC verification. Review this detail during backend security hardening. |
| Low | Operational observability/recovery unverified | Alerting, log retention, backup restoration and Meta rate-limit behavior were not exercised. |

## Secret/configuration review

The checked-in examples contain variable names and placeholders, not live credentials. Server-only variable names include `SUPABASE_SERVICE_ROLE_KEY`, `AMAR_BAZAR_WORKER_SECRET`, `META_ACCESS_TOKEN`, `META_WEBHOOK_VERIFY_TOKEN`, and `META_APP_SECRET`; these must never be copied into `EXPO_PUBLIC_*`, `VITE_*`, source code, or a public site artifact. No secret values are reproduced here.

## Not tested

- Cross-customer order/address access, anonymous writes, staff-role escalation, SQL injection, function abuse, race conditions, CSRF/XSS, rate limits or session revocation.
- Real OTP/email delivery, live Meta templates, callback signature examples or webhook replay.
- Dependency vulnerability advisories.
- Production logs, backups, Supabase project settings or GitHub deployment secrets.

## Required security gate before a pilot

1. Test RLS with at least two synthetic customers and staff users for each role.
2. Verify direct table writes are denied and RPC/Edge Function actions enforce exact roles and valid order-state transitions.
3. Verify price, stock, fee, stale quote and duplicate idempotency behavior under concurrent requests.
4. Add MFA or equivalent strong controls for administrators; define staff provisioning/revocation.
5. Restrict the Pages deployment artifact to public website output.
6. Keep WhatsApp outbox dry-run until templates, opt-in and failure handling are verified.
7. Run dependency advisory checks and a backup restore exercise in staging.
