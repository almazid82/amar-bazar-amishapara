# Amar Bazar Production Deployment Guide

No production service was changed by this preparation. The Supabase project is not linked, production credentials are absent, and no deployment or store submission was performed.

## 1. Establish production ownership and environments

1. Create or identify the production Supabase project under the owner's organization. Record the project reference and region in the private operations record.
2. Keep separate development, preview, and production projects. Never use real customer data in preview.
3. Configure the Expo EAS `preview` and `production` environments separately. Only the Supabase project URL and publishable key belong in the customer app.
4. Configure admin access separately from customer access. Use named staff accounts, least privilege, MFA where available, and a documented account-recovery owner.

## 2. Review and deploy the backend

Before a production migration:

1. Review every migration and Edge Function in the repository against the approved architecture and current schema.
2. Confirm the production project's schema and take a restorable backup/snapshot.
3. Verify RLS is enabled on all customer data tables. Test as anonymous, customer A, customer B, and admin; each customer must see only their own private records.
4. Verify server-side order pricing, stock checks, idempotency, transactional stock updates, and permitted order-status transitions.
5. Verify function authentication, authorization, input validation, rate limits, logging redaction, and failure behavior.
6. Apply migrations and functions first to preview, run the complete acceptance journey, then schedule the production change with the owner. Do not overwrite production data.

The repository does not contain proof of a production migration or production RLS/Edge Function validation. Treat these as release blockers until verified against the real project.

## 3. Configure WhatsApp safely

Use only the official Meta WhatsApp Cloud API. The business owner must provide and verify a Meta business account, WhatsApp Business phone number, phone-number ID, app/token permissions, approved message template, recipient consent and production messaging configuration.

Store tokens and webhook secrets only as Supabase server-side function secrets. Never put them in the Android app, browser dashboard bundle, source control, or Expo public variables. Configure the correct admin recipient and an approved Bangla/English template. Keep `WHATSAPP_DRY_RUN=true` until a controlled, owner-approved live test is ready. Confirm that failures retry without duplicating a message or affecting the saved order.

## 4. Backups and recovery

1. Confirm the selected Supabase plan's backup and point-in-time recovery features, retention, and recovery window.
2. Set recovery objectives (acceptable data loss and restore time) with the business owner.
3. Take a backup before each schema migration and verify that an authorized operator can restore it to a separate project.
4. Document who can access backups, how secrets are recovered, and how the storefront is paused during recovery.

Backup and restore capability has not been verified for a real production project.

## 5. End-to-end release validation

Use a fresh test account and test data in preview. Verify:

- Install and launch on a supported Android device; app name, icon, splash, navigation, and network access work.
- Product images, categories, prices, availability, search, cart persistence, and area-specific delivery fee are correct.
- Checkout validates phone/address and shows the correct cash-on-delivery total.
- One deliberate order creates one server-priced order and reserves stock once; repeated taps/retries do not duplicate it.
- Customer A cannot read Customer B's profile, address, or order.
- Authorized staff can review, confirm, process, deliver, or safely cancel an order; unauthorized accounts cannot.
- WhatsApp sends the approved notification once, logs its result, and retries eligible failures safely.
- Offline, timeout, function error, out-of-stock and notification failure states do not show false success or lose an order.

Do not use real customer data or place a live COD order as a test without the owner's explicit operational approval.

## 6. Google Play preparation

The owner must have a Google Play Developer account and provide/complete:

- Store listing name, description, support contact, privacy policy URL, screenshots, app icon and feature graphic.
- Accurate Data safety and app-content declarations, including phone number, address, order, analytics and notification data actually collected.
- Target audience, content rating, app access instructions for any gated area, and country availability.
- Release signing custody and recovery plan.
- Internal testing track reviewers and test instructions.

Build an AAB using the production profile in `BUILD_GUIDE.md`. Upload it manually to the Play Console internal-testing track only after approval. Review automated Play checks and install the Play-delivered build before promoting it. This guide does not authorize submission or rollout.

## Release stop conditions

Do not release while any of these remain unresolved:

- Expo EAS project is not linked or preview APK has not been installed and checked.
- Production Supabase project, migrations, RLS, functions, secrets, and backup/recovery are unverified.
- Production catalog, stock, delivery areas/fees, service hours, and COD operations are unconfirmed.
- Official WhatsApp credentials/template and live failure/retry behavior are unverified.
- Full customer-to-admin order journey has not passed in preview.
- `glob` / `minimatch` advisories from the previous dependency review have not been resolved or accepted with a documented rationale.
- Privacy policy and Google Play declarations do not match actual data handling.
