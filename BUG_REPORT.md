# Phase 6 — Bug Report

**Date:** 2026-11-09

## Confirmed issues

### AB-SEC-001 — Expo CLI dependency advisories

- **Severity:** Moderate (two transitive advisories)
- **Area:** Android development/build toolchain
- **Reproduction:** Run `pnpm audit --json` from `apps/customer`.
- **Observed:** `glob@13.0.6` and `minimatch@10.2.6` are reported vulnerable through Expo CLI/fingerprint tooling.
- **Impact:** Exposure is in build/development tooling dependency tree; this does not establish that either package is bundled into the Android app. Still unresolved for a release pipeline.
- **Status:** Open. Registry's patched versions cross major-version ranges; no safe automatic fix is available in the current Expo CLI dependency declaration. No override was forced.

## Environment blockers (not app defects)

- Supabase CLI, Docker and Deno are unavailable, and there is no configured local/live Supabase project. Database, RLS, Edge Function, login, realtime, and order lifecycle scenarios could not be executed.
- No Android emulator/ADB or connected test device was available. Metro export succeeded, but APK/AAB installation and device usability were not tested.
- No Meta API credentials or approved template are configured. WhatsApp success, error, rate-limit and webhook delivery remain untested.

## Defects found during the requested work

- The previous admin setup page had no way to see dashboard layout without a Supabase backend. **Fixed:** a clearly labelled fictional, read-only demo route is now available at `http://localhost:5173/?preview=1`; no demo action is sent to a backend.
- No other reproducible application defect was confirmed by the checks executed. This is not evidence that the untested integrations are defect-free.

