# Phase 6 — Security Audit

**Date:** 2026-11-09  
**Method:** source/config review, static credential and transport scans, registry dependency audit, TypeScript checks and Android Metro export. No live backend or third-party account was accessed.

## Findings

### S1 — Moderate: vulnerable Expo CLI transitive dependencies

The customer workspace audit found:

- `glob@13.0.6` — GHSA-3g3m-2fjr-6pw4, affected `>=9.0.0 <=14.0.1`; registry indicates `>=14.0.2` is patched.
- `minimatch@10.2.6` — GHSA-g3hv-75wg-m249, affected `>=7.0.0 <11.0.1`; registry indicates `>=11.0.1` is patched.

Both are reached through Expo SDK 58 / `@expo/cli` tooling and were rated moderate by the package registry. The current `@expo/cli@58.1.19` declares `glob: ^13.0.0`; the patched `glob` is a major version outside that range. The audit supplied no automatic fix. No forced override was applied because it could break Expo's build tooling. Recheck after Expo publishes a compatible update and require a clean audit before release.

### S2 — Release blocker: authorization/RLS behavior is not runtime-verified

Static review found role checks in staff RPCs, RLS policies for customer-owned orders/addresses, and staff-only notification reads/retry. These policies and SQL functions have **not** been applied to a local database or tested with customer/operator/catalog-manager/admin accounts. Treat unauthorized-access prevention as unverified until negative and positive RLS tests run.

### S3 — Release blocker: notification delivery is not runtime-verified

The worker keeps Meta credentials server-side and defaults to dry-run unless `WHATSAPP_DRY_RUN=false`. The admin alert contains customer contact/address and order details; those are sensitive data. Verify the recipient number, template approval, opt-in/policy requirements, webhook signatures, retry idempotency, and device/account access in a dedicated test environment before using real customer data.

## Controls observed in source (not runtime proof)

- Browser and Android clients use only public Supabase URL/publishable-key configuration; no service-role or Meta credential pattern was found in tracked source/config during the static scan.
- Server-only helpers require the service-role key inside Edge Function runtime; notification-worker additionally checks an internal worker secret. Do not place these in `VITE_*` or `EXPO_PUBLIC_*` variables.
- `create-order` validates identifiers, quantities, item count, phone/address fields and coordinates before calling the database. Database order creation calculates price/fee server-side, applies stock rules transactionally, and accepts an idempotency key. These claims still need local DB tests.
- Status mutations and quote verification are routed through restricted functions and guarded role/status/version checks in SQL.
- Address/order reads are intended to be owner-or-authorized-staff only. Outbox/logs are granted to staff roles only by the Phase 5 migration.
- Plain HTTP references found are local development/emulator configuration or SVG namespace URIs; production Edge Function calls use HTTPS Supabase/Meta endpoints.
- No SQL injection indicator was identified in the reviewed paths; database access uses Supabase client/RPC parameters and database functions validate inputs. This was a source review, not fuzz testing.

## Required before release

1. Apply all migrations to disposable local Supabase; execute RLS tests as anonymous, customer, each staff role, and service worker.
2. Test server-side prices, stock reservation/release, duplicate idempotency, rollback, quote versioning and every allowed/denied status transition.
3. Complete device-level Android testing and inspect network/auth failure handling.
4. Reconcile the two moderate Expo toolchain advisories with Expo's supported dependency versions; do not ship until accepted by the project owner with a documented mitigation or clean audit.
5. Run WhatsApp dry-run tests, then test a Meta-approved template with a synthetic test recipient. Verify retry/deduplication and signature validation before any real customer message.
6. Re-run full dependency audits and secret scans on the final release commit.

