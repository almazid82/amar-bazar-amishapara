# Amar Bazar — Phase 0 Testing Checklist

## Checks completed in this audit

| Check | Result | Notes |
|---|---|---|
| Root `app.js` syntax (`node --check app.js`) | PASS | Parse only; no DOM/business flow execution. |
| Admin TypeScript (`tsc --noEmit --incremental false`) | PASS | Used existing local compiler directly; no install. |
| Customer TypeScript (`tsc --noEmit --incremental false`) | PASS | Used existing local compiler directly; no install. |
| Admin Vite production build | PASS | 74 modules; emitted into a unique temporary directory outside the repository. |
| Root website local HTTP fetch | BLOCKED | `127.0.0.1:4173` socket access was denied by current environment. Browser interaction was therefore not attempted/repeated. |
| Existing automated unit/integration test scripts | NOT CONFIGURED | Neither application `package.json` declares a test script. |
| Supabase CLI/local database tests | NOT AVAILABLE | `supabase` CLI was not found; no database operations were attempted. |
| Remote Supabase/Meta checks | UNVERIFIED | No local environment files or authorized staging credentials were available. |
| Real customer order / production data | NOT USED | No real order, account, or mutation was created. |

## Pilot staging acceptance checklist

### Customer application

- [ ] Fresh install and launch on supported Android versions.
- [ ] Auth flow: valid OTP, invalid/expired OTP, resend limits, sign-out and session restoration.
- [ ] Catalog loads only active products/categories from Supabase; image failures have a fallback.
- [ ] Search and category filters work with empty, loading and network-error states.
- [ ] Cart persists; stale/deactivated products cannot be submitted.
- [ ] Selected area immediately displays current fee; unsupported/expired area is rejected server-side.
- [ ] Checkout validates name, Bangladesh phone, address and quantity.
- [ ] Server ignores client totals and prices; changed price/stock is represented accurately.
- [ ] Repeated taps/network retry with same idempotency key do not create duplicate orders.
- [ ] Request receipt explicitly shows pending shop verification, not confirmed.
- [ ] Owner can retrieve their order/history; a second customer cannot.
- [ ] Customer can approve, request changes, or reject only the current quote version.

### Admin dashboard

- [ ] Unauthenticated access shows login; customer/non-staff account cannot access staff data.
- [ ] Admin, order operator and catalog manager each see only authorized sections/actions.
- [ ] Order search, filters, details and new-order Realtime update work.
- [ ] Shop availability/price check requires all requested lines and valid fee/ETA.
- [ ] Stale quote version is rejected; phone outcome is recorded with staff actor.
- [ ] Approval leads to confirmed order and stock reservation; cancellation releases reserved stock.
- [ ] Confirmed → preparing → out_for_delivery → delivered follows allowed transitions only.
- [ ] COD record rejects invalid/over-tolerance collection and updates the ledger.
- [ ] Product/category/stock/area/settings changes are audited and role-checked.

### Supabase security/backend

- [ ] Apply migrations to isolated staging and compare schema/migration history.
- [ ] Run RLS matrix for anon, customer A, customer B, admin, order operator, catalog manager and service role.
- [ ] Verify direct customer table mutations are denied where writes should use RPCs.
- [ ] Verify order and inventory behavior under concurrent stock changes and rollback failures.
- [ ] Check public configuration contains publishable key only; server secrets are not in app bundles.
- [ ] Verify backups, retention, restore procedure, function logs and alerting.

### WhatsApp and failure recovery

- [ ] Dry-run records completion without external message transmission.
- [ ] Correct template names, language, required parameters and opt-in are verified with Meta.
- [ ] Worker cannot be called without the internal worker secret.
- [ ] 429/5xx/timeouts retry safely; permanent errors become dead letter with actionable code.
- [ ] A timeout after provider acceptance does not cause an uncontrolled duplicate message.
- [ ] Webhook valid signature, invalid signature, oversized payload and duplicate callback are covered.
- [ ] Failed notification never deletes/reverses a valid order.

## Test classification guidance

Only mark a case **PASS** after executing it against the relevant local or isolated staging environment. Source inspection alone is **CODE-PATH FOUND**. Screenshots without a live service can validate layout only, not data/security behavior. Do not use production data for these tests.
