# Phase 6 — Full System Test Report

**Date:** 2026-11-09  
**Scope:** Amar Bazar Android customer app, Supabase migrations/Edge Functions, web admin, and WhatsApp worker.  
**Environment:** local Windows workspace; no linked Supabase project, running local database, Docker, Supabase CLI, Deno, Android emulator, or Meta credentials were available.

## Executed checks

| Check | Result | Evidence / limit |
|---|---|---|
| Android app TypeScript | **PASS** | `apps/customer`: `node_modules/.bin/tsc.cmd --noEmit` exited 0. |
| Android JavaScript bundle export | **PASS** | `EXPO_HOME=.expo-home`, telemetry disabled, offline; `expo export --platform android` bundled 1,446 modules and exported `apps/customer/dist`. This is a Metro export, not an APK/AAB or device test. |
| Admin TypeScript and production bundle | **PASS** | `apps/admin`: `tsc -b` and `vite build` succeeded; 74 modules transformed. |
| Admin demo route | **PASS (UI load only)** | `http://localhost:5173/?preview=1` rendered labelled fictional/read-only overview and sample order table in the local browser. Backend screens and actions were not exercised. |
| Admin dependency advisory audit | **PASS** | `pnpm audit --json`: 0 advisories across 128 production and 116 development dependencies. |
| Customer dependency advisory audit | **FAIL / OPEN** | Registry audit found 2 moderate advisories in Expo CLI transitive tooling: `glob@13.0.6`, `minimatch@10.2.6`. Registry reports patched ranges `glob >=14.0.2`, `minimatch >=11.0.1`, with no automatic fix. See `SECURITY_AUDIT.md`. |
| Credential pattern scan | **PASS (static scan only)** | No matching service-role secret, Meta token, or JWT-like credential found in source/config outside examples, generated dependencies, and build output. This is not a guarantee against every secret format. |
| Plain HTTP scan | **PASS (expected local references only)** | Matches are local Supabase/emulator URLs and SVG namespace declarations; application production API endpoints are HTTPS/configured. |

## Not executed

- Customer navigation and visual flows on an Android emulator or physical device.
- Product queries, search/filter results, cart persistence/calculations, checkout validation, real order creation, duplicate replay, order history, and status tracking against Supabase.
- Database migration application, SQL parsing/execution, RLS allow/deny tests, transactional rollback, stock contention, and role authorization. Supabase CLI/Docker/local DB were unavailable.
- Admin login, role separation, customer-data access restrictions, live Realtime updates, mutations, or notification retry against Supabase.
- WhatsApp success/failure/rate-limit/retry/deduplication/missing-secret scenarios against Meta. No credential or approved template was configured; no message was sent.

## Result

**Not release-ready.** The frontend checks pass, but integration/security controls have not been exercised against a database or device, and the customer dependency audit has two unresolved moderate advisories. Do not treat frontend build success as proof of the order, RLS, or notification workflows.

