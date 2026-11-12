# Amar Bazar — Release Checklist

**Current release decision: HOLD.** No deployment, publication, commit, or push has been performed.

## Completed locally

- [x] Customer TypeScript check passes.
- [x] Android Metro bundle export succeeds.
- [x] Admin TypeScript and Vite production build succeed.
- [x] Admin design preview is labelled fictional/read-only.
- [x] No candidate service-role/Meta credential/JWT was found in the static scan.
- [x] Build and security/test outcomes are recorded in `TEST_REPORT.md`, `SECURITY_AUDIT.md`, and `BUG_REPORT.md`.

## Required before a release candidate

- [ ] Resolve or formally accept the two moderate Expo CLI dependency advisories; rerun audit.
- [ ] Start disposable local Supabase and apply every migration in order.
- [ ] Test RLS for anonymous, customer, order operator, catalog manager, admin and worker roles, including denied cross-customer reads/writes.
- [ ] Test server price/fee calculation, inventory contention and rollback, duplicate idempotency, quote/version decisions and forbidden order transitions.
- [ ] Verify Auth configuration, staff provisioning, recovery, session expiry and least-privilege roles.
- [ ] Seed only reviewed pilot products, shop availability and approved village delivery fees; keep live orders disabled until operations are ready.
- [ ] Test Android on supported emulator and physical devices, including slow/offline network, retries and duplicate taps.
- [ ] Test admin dashboard sign-in, authorization, data access, status changes, product/stock edits and notification log against local Supabase.
- [ ] Test WhatsApp worker in dry-run; then use a Meta-approved template and synthetic recipient to verify accepted/error/429/retry/unknown/webhook cases.
- [ ] Verify PII handling, retention, staff-device access and the admin WhatsApp recipient before sending real customer data.
- [ ] Build and install the release APK/AAB; inspect the artifact for secrets and confirm Android permissions/signing configuration.
- [ ] Obtain owner approval for production backend migration, Meta secrets, order intake, dashboard deployment, and app release separately.

## Release gate

Do not enable real order intake or send customer data until all required checks are completed and reviewed. Approval for this checklist does not itself authorize deployment or live messages.

