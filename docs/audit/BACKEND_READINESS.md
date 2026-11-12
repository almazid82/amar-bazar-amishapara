# Amar Bazar — Backend Readiness

## Readiness classification

**Repository implementation: D — substantial backend implementation exists, while required runtime/production configuration is absent or unverified.**  
**Live Supabase service: UNVERIFIED.** This is not a claim that production is configured or operational.

The files include five ordered SQL migrations, Supabase configuration, a seed file and Edge Functions for customer order creation, customer quote decisions, staff operations, WhatsApp notifications and webhook events. This exceeds mere client scaffolding. However, no project URL/keys were configured locally, no Supabase CLI was available, and no authorized remote database status was checked.

## Evidence of intended data and workflow

- Migrations define profiles, staff roles, shops, categories, products, inventory, delivery areas, settings, addresses, notification preferences, orders, order items, verification checks, contact attempts, decisions, status history, COD payments, stock movements and notification outbox/logs.
- RLS is enabled across business tables. Public reads are limited to active catalog/service information; order/address access policies are scoped by owner and staff role.
- `create-order` validates the authenticated bearer token, request schema and idempotency header, then calls `create_order` with the user JWT.
- The SQL order function reads current product prices and delivery fees from database rows, checks item availability and stock, snapshots the request, and handles duplicate request keys transactionally.
- Staff quote creation validates current order/version and stores available/unavailable/substituted item details and final prices. Customer approval reserves stock and creates the COD receivable. Staff transitions handle preparation, delivery and inventory settlement/release.
- The notification worker uses server-side service-role credentials; dry-run is the default unless `WHATSAPP_DRY_RUN=false`. Meta token, phone-number ID, Graph API version and admin recipient are required for actual delivery. Customer update notifications require consent. Webhook POSTs validate Meta HMAC signatures.

## Configuration presence

Only environment variable names are reported; no secret values were accessed or displayed.

| Configuration | Template names found | Local `.env` present? | Remote value status |
|---|---|---:|---|
| Android client | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No | UNVERIFIED |
| Admin client | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | No | UNVERIFIED |
| Functions / worker | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AMAR_BAZAR_WORKER_SECRET` | No | UNVERIFIED |
| WhatsApp Cloud API | `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, `META_API_VERSION`, `META_TEMPLATE_LANGUAGE`, `ADMIN_WHATSAPP_PHONE`, `WHATSAPP_DRY_RUN` | No | UNVERIFIED |
| WhatsApp webhook | `META_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET` | No | UNVERIFIED |

Files checked for local environment: root `.env`, `apps/admin/.env`, `apps/customer/.env`, `supabase/functions/.env`; all were absent. `.env.example` files were present and contain placeholders. EAS cloud environment variables and deployed Supabase secrets were not inspected.

## Can backend replace localStorage checkout without rebuilding the frontend?

Not by connecting the root website as-is. Its form stores a client-generated object in localStorage and its staff modal reads that same local object. It does not call Supabase. Replacing the submit path, customer identity handling, order retrieval, quote workflow and staff route would require meaningful front-end changes and a safe server-backed design; it is not a credentials-only switch.

The Android customer app and separate admin dashboard already have backend-oriented code paths. They are the more direct integration surface for the migration plan, but they still need project configuration, database/function deployment and complete staging verification.

## Missing verification / production readiness

- Actual Supabase project connection and project identity.
- Migration history compared with the remote schema; migration application not attempted.
- Seed application and catalog correctness.
- Edge Function deployment, secrets and invocation behavior.
- Auth provider / SMS setup, OTP delivery and redirect configuration.
- Admin staff provisioning and tested role matrix.
- RLS tests against real customer and staff sessions.
- WhatsApp Meta app, approved message templates, webhook subscription, delivery status and retry schedule.
- Backup retention, restore drill, alerting, rate limits and incident response.
- Android runtime build against the configured project.

## Safe next step

Create or select a non-production Supabase project and stage configuration only after approval. Apply the migration set to that disposable/staging environment, seed reviewed demo catalog data, deploy functions in dry-run mode, then test with synthetic accounts and synthetic orders. Do not point either customer app at production until isolation and recovery checks pass.
