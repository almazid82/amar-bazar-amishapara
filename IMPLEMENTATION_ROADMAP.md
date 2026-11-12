# Amar Bazar Implementation Roadmap

**Status:** planning only; implementation awaits approval.  
The existing static site remains unchanged until the architecture is approved.

## Phase gates

### Phase 0 — Product and operations decisions

**Decide and record:** launch villages and exact fee list; partner shops and authorized contact process; verified opening hours; initial customer catalog and price owner; single-shop vs mixed-shop carts; phone OTP vs guest browsing; verbal approval fallback; substitution policy; COD reconciliation owner; WhatsApp opt-in text/opt-out; privacy/retention; order response/expiry window.

**Exit:** signed-off pilot scope and an owner-confirmed catalog/service-area spreadsheet.

### Phase 1 — Repository and environments

- Approve monorepo boundaries: Expo customer app, separate React admin, Supabase migrations/functions, shared domain package; decide whether to retain static marketing website.
- Set up local development, staging and production Supabase projects; protect GitHub branches and CI secrets.
- Establish code quality standards, TypeScript strictness, environment variable naming, error codes and migration review process.

**Exit:** builds start locally and staging credentials are isolated; no production data is present in development.

### Phase 2 — Backend foundation and security

- Create database enums/tables, constraints, indexes, migrations and safe development seed data.
- Configure Supabase Auth phone OTP, staff provisioning and role lifecycle.
- Implement and test RLS/grants for anonymous catalog reads, customer own-order access, and staff roles.
- Implement Storage buckets/policies and data retention/backup approach.

**Exit:** automated authorization tests prove cross-customer isolation and prevent customer/admin privilege escalation.

### Phase 3 — Core order engine

- Implement idempotent order creation, server-calculated estimates, immutable snapshots, shop verification/quote versioning, customer approval, allowed transitions, optional stock reservation/ledger, and COD records.
- Add concurrency and rollback checks for duplicate requests, inventory conflicts, quote stale decisions, cancellation, delivery and cash reconciliation.

**Exit:** order and stock invariants hold under retries and competing requests; audit event chain is complete.

### Phase 4 — Android customer app

- Build Expo Router onboarding/auth, home/catalog, product/shop menus, local cart, area/address selection, checkout, request state, quote review/approval, order history/detail, support, and profile.
- Add accessible controls, low-bandwidth image loading, offline/error/retry states, safe-area/keyboard handling, and tested app links.
- Carry over approved logos/colors/content/images only; import confirmed product data.

**Exit:** customer can make a request, understand it is pending, review exact quote, explicitly approve/decline, and see server-owned status updates on supported Android devices.

### Phase 5 — Admin dashboard

- Implement staff login/role-gated pages, order queue, per-line shop verification, quote/ETA creation, phone outcome recording, catalog/price/availability, delivery area/fee management, staff access, COD reconciliation, and audit review.
- Restrict operational views to minimum customer data and log sensitive changes.

**Exit:** operators can fulfill the complete manual call-and-verify process without direct database editing; unauthorized roles cannot perform restricted actions.

### Phase 6 — WhatsApp integration

- Set up Meta Business assets/Cloud API credentials in the correct business account; approve templates; configure webhook URL/signature verification and transactional opt-in process.
- Build transactional templates and outbox worker; test delivery/read/failure events, duplicate webhooks, retry ambiguity, dead-letter recovery, and phone fallback.

**Exit:** order notifications do not mutate order approval and failures are visible/actionable by staff.

### Phase 7 — Pilot and Android distribution

- Run a staff-only/staging simulation, then a controlled pilot with a limited set of shops/areas and real operating hours.
- Track order conversion, call response time, unavailable items, quote changes, delivery fee complaints, COD mismatch, notification success and cancellation reasons.
- Produce signed internal `.apk` for device testing; produce production `.aab` only after release gates and account setup.
- Maintain versioned release notes, support contact, privacy policy, backup/restore validation and rollback plan.

**Exit:** owner approves expanded pilot or public release based on operational evidence.

## Minimum release scope (v1)

- Customer phone OTP, active catalog/shop browsing, local cart, area fee estimate, address entry, request submission and own-order tracking.
- Admin role system, manual shop stock/price verification, customer final approval/call recording, status updates, COD collection log, product/area updates.
- WhatsApp transactional notifications with customer opt-in, approved templates, delivery monitoring and phone fallback.
- Optional stock tracking only for items with reliable shop-maintained counts. No rider application, live rider GPS, online payment, promotions/loyalty, multi-region routing, or automated supplier integrations in v1.

## Test and release gates

- **Database:** constraints, transaction rollback, RLS grants/policies, indexes, migration rollback/replay.
- **Workflow:** order idempotency, alternate/unavailable item, changed quote, customer approval/rejection, phone approval, expiry, cancellation, concurrent stock, COD mismatch.
- **Security:** cross-user reads, customer direct writes, role changes, function JWT, webhook signatures, secret scanning, PII log redaction.
- **Mobile:** Android OS/device matrix, weak/interrupted network, permission denial, location fallback, app background/reopen, app links, accessibility, small displays.
- **Operations:** shop call scripts, staffing window, message failures, support ownership, backup restore, role revocation, admin audit.
- **Distribution:** signed APK/AAB profile, version code, store/privacy declarations, signing key backup and rollback plan.

## Approval checkpoint

Review all six design documents alongside `SYSTEM_ARCHITECTURE.md`. Before implementation, resolve the Phase 0 decisions and approve the proposed OTP, order-approval, stock, mixed-shop cart, COD, and WhatsApp-consent assumptions. No app, database, external service, or deployment work is included in this phase.

