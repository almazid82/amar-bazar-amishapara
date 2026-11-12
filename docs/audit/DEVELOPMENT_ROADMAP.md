# Amar Bazar — Recommended Development Roadmap

This is a proposal only. Phase 0 did not implement application changes.

## Phase 1 — Confirm scope and operational rules

- Choose the pilot ordering surface: Android app or a reworked web customer app. Keep the current static website as informational/demo until a server-backed flow replaces it.
- Confirm shop partners, catalogue ownership, price update process, delivery zones/fees, hours, minimum order, cancellation rules and realistic delivery estimates.
- Confirm whether customer OTP is mandatory and whether verification is by phone call, app quote approval, or both.
- Confirm responsible staff roles and escalation/after-hours process.

**Exit:** signed-off business rules and role matrix; verified pilot data source.

## Phase 2 — Isolated Supabase staging

- Provision a separate non-production project and safe client env for customer/admin applications.
- Apply migrations in order, review seed data and verify the actual remote schema against migration files.
- Configure Auth provider/redirects and provision synthetic roles through a controlled admin-only process.
- Deploy Edge Functions with server-only credentials and WhatsApp dry-run enabled.

**Exit:** staging deployment record and no production credentials/data.

## Phase 3 — Customer order lifecycle

- Exercise browse → cart → address/area → server-priced order request → staff shop check → verified quote → customer approval/change/rejection.
- Verify stable retry/idempotency, duplicate taps, connection loss, unavailable products, substitute item, stale quote and disabled store/COD behavior.
- Verify only the owner can retrieve their order and the customer sees “request received” rather than “confirmed” before approval.

**Exit:** all workflow acceptance cases pass in staging with synthetic records.

## Phase 4 — Staff operations and fulfillment

- Validate each staff role and its permitted dashboard sections/actions.
- Exercise order transitions, inventory reservation/release, cancellation, out-for-delivery, delivery completion and COD collection.
- Test concurrent inventory/order operations and verify audit/status history.

**Exit:** authorized staff can complete a synthetic order with accurate ledger/history and no cross-role access.

## Phase 5 — Notifications and support

- Test outbox creation and retry in dry-run.
- Configure approved Meta templates and opt-in only after consent and business account setup are confirmed.
- Verify notification idempotency, timeouts, 429/5xx handling, webhook signatures, duplicate callbacks and dead-letter recovery.

**Exit:** rehearsed notification lifecycle with no duplicate customer/admin messages.

## Phase 6 — Public web and Android release preparation

- Choose separate hosting/build pipelines for root public site, admin dashboard and Android application.
- Restrict public Pages artifact to intentional public files; do not publish internal deployment/configuration artifacts accidentally.
- Run automated checks and visual review on desktop and physical Android devices.
- Document backups/restore, monitoring, privacy, support, incident handling and rollback before accepting real orders.

**Exit:** owner review of production checklist and explicit deployment approval.

## Recommended priority

Focus first on a working, isolated staging backend plus the selected customer checkout and staff verification journey. Do not spend the pilot effort polishing the root localStorage mock as if it were a production order system. Preserve the current visual work as a reference while one server-backed checkout path becomes the source of truth.
