# Amar Bazar — Complete Project Handover

**Prepared:** 11 November 2026 (Asia/Dhaka)  
**Purpose:** Restore project continuity in another ChatGPT/Codex session or laptop.  
**Local repository:** `C:\Users\shams\Documents\Codex\2026-11-05\ne\outputs\amar-bazar-prototype`  
**GitHub:** <https://github.com/almazid82/amar-bazar-amishapara>  
**Previously reported public site:** <https://almazid82.github.io/amar-bazar-amishapara>

> Treat this as a handover of the accessible thread and the inspected checkout, not as proof that a live Supabase service, SMS, WhatsApp, order processing, or deployment is operational. The repository has substantial local, uncommitted changes. Reconcile this document with the current checkout before acting.

## 1. Executive handover

Amar Bazar is a community commerce pilot based at Amishapara Bazar, Sonaimuri, Noakhali, Bangladesh. It is intended to serve nearby villages with goods sourced from participating shops at the market. The central operating rule is human verification: a customer's request is checked with the shop, the final availability/prices/fee are shown to the customer, and the order is confirmed only after explicit customer approval.

The project currently contains three client surfaces and a shared backend implementation:

1. **Root customer website:** existing static HTML/CSS/vanilla JavaScript. The original checkout was a same-browser Local Storage simulation. During the current Phase 4 work, a Supabase REST/Auth/function client was added in `web-backend.js`; `web-config.js` is blank. The intended live path is not connected or verified.
2. **Admin dashboard:** separate React + Vite + TypeScript application under `apps/admin`; includes source for role-restricted staff workflows, catalog management and order operations. TypeScript and production bundle builds passed in the prior Phase 3 turn. Database runtime acceptance is not complete.
3. **Android customer app:** Expo Router + React Native + TypeScript under `apps/customer`; source includes customer auth, catalog, cart, address, checkout, quote decision, order history and status screens. User installed an APK after Node/EAS setup, but the release/configuration and backend have not been fully verified. The earlier Expo Go preview repeatedly failed with “Something went wrong” / remote update download errors.
4. **Shared backend:** Supabase/PostgreSQL migrations, RLS policies and Edge Functions under `supabase/`. There are eight ordered migration files at this checkout, including admin management and customer cancellation. They are not known to have been applied to any local/staging/production database.

**Current task point:** Phase 4 — Customer Website & End-to-End Order Operations. Source work is in progress. Browser/Auth/database end-to-end workflow was not run. Do not call Phase 4 complete and do not proceed to Phase 5 until an isolated staging environment is connected and the full lifecycle passes owner review.

## 2. Scope, evidence and confidence

This handover uses the accessible current conversation (some older history is summarized/compacted), the pasted phase prompts, and a local repository inspection on 11 November 2026. It does not claim full access to other ChatGPT threads, previous laptop state, external account settings, private deployments, or a live backend.

Labels used below:

- **Verified in source:** code/document/config exists locally.
- **Check passed:** a command actually completed successfully, but only for the named check.
- **Reported by owner:** the user said an action/result happened; it was not independently verified here.
- **Unverified:** no suitable runtime, account access, service configuration or evidence was available.
- **Proposed:** architecture or next step, not deployed behavior.

The latest repository inspection showed Git branch `main`, remote `origin` pointing at the GitHub URL above, and `HEAD` at `b280a27` (`Fix mobile hero text column`), matching `origin/main` when inspected. This only establishes the checked-out refs at that moment. The working tree has many modified and untracked files, including application code, migrations and docs. Those changes are **not committed or pushed**. Do not reset, clean, overwrite, cherry-pick or force-push them.

## 3. Product goals and business decisions

### Intended operating area and catalog

- Market hub: **Amishapara Bazar**. Initial service is restricted to this market and the owner-confirmed nearby villages/areas.
- Intended goods: food, restaurant meals, groceries and daily essentials; medicines were discussed but must not be enabled without confirming a licensed pharmacy partner and applicable operating requirements.
- The supplied flyer listed 31 areas and illustrative delivery fees. These are pilot reference material, not yet verified authoritative database values. Confirm spelling, coverage and fee with the owner before enabling paid orders.
- User supplied restaurant material for **Half Time Cafe**, **Foodi Goodi**, and **Royal Restaurant & Kebab Ghor**. Half Time Cafe list/prices were transcribed from supplied menu photos in the static site. Menus, current price and partnership status require shop confirmation.
- Original flyer said “20-minute delivery.” Prior planning recognized this as an unverified/risky promise. Prefer estimated/confirmed delivery times until measured pilot data supports a guarantee.
- Main phone shown in supplied materials: `01884989479`.
- WhatsApp link supplied: <https://wa.me/message/HZWKCZLY65VXN1>.
- Owner supplied map/share link: <https://share.google/JQUnyHd6pPUEBJW7y>; actual destination/pin was not verified.
- Developer credit requested on website and admin: **Shamsul Al Mazid · Statistics, Dhaka College**. Local HTML/admin source has a highlighted credit; changes are uncommitted.

### Order workflow (core product requirement)

1. Customer selects current listed products, quantities, a delivery area and address.
2. Customer is authenticated (planned/current source: SMS phone OTP) and submits an **order request**, not an immediately confirmed order.
3. Backend loads current item prices, stock and area fee; validates quantities, settings and idempotency; calculates estimates and records history.
4. Admin/order operator contacts the participating shop, checks availability, actual price and possible substitutions.
5. Staff sends a versioned quote with updated items, delivery fee and total.
6. Customer explicitly approves, requests changes or rejects. A stale quote version must be rejected.
7. Only after approval does the server confirm and reserve tracked stock; COD due is created.
8. Staff prepares/collects, assigns delivery, dispatches, records COD and marks delivery complete.

For the first operational pilot, use the customer website plus admin dashboard. No standalone rider app is planned for release one; staff manually assigns a rider and controls transitions. A future shop-owner role/app and rider mobile view are ideas to evaluate after the core staff/customer flow is reliable. Keep an explicit boundary for what customer/receiver sees; no separate receiver account model has been approved.

## 4. Brand, UX and user preferences

- Brand: **Amar Bazar / আমার বাজার**. Keep the provided logo artwork rather than recreating Bengali wordmark text in a different font.
- Product/UI copy should be English except the Bengali logo/wordmark, per the user's explicit preference.
- Visual identity: market green, warm cream/white, fresh product photography, polished but mobile-friendly and natural; avoid generic/repeated placeholder photos.
- User repeatedly requested real mobile and desktop previews/screenshots and was frustrated by instructions that assumed Expo QR preview worked. Never claim preview success from a running server alone.
- User prefers short, practical explanations, direct next actions, and collaboration that incorporates their own decisions. Avoid overly long/excessive follow-up copy.
- The user wants each phase reviewed independently and does not want later phases started until they approve. Do not deploy, migrate a live project, publish, commit or push unless the authorization for that specific action is clear. In this phase prompt, staging/test implementation was authorized; live deployment was not.
- When debugging, distinguish a code/build check from browser/device operation and from real database acceptance.

## 5. Architecture and repository map

```text
Customer website (static HTML/CSS/JS) ───────┐
Admin dashboard (React/Vite/TypeScript) ─────┼── Supabase Auth / Postgres / RLS
Android customer app (Expo/React Native/TS) ─┘       │
                                                    ├─ Edge Functions / SQL RPCs
                                                    ├─ Storage for product media
                                                    └─ outbox → WhatsApp worker/webhook
```

Use one shared Supabase backend. Do not add a second backend or put authoritative prices, totals, stock, roles, or order transitions in the browser/app. Public project URL and publishable key may be in clients; service-role and Meta credentials must remain server-side.

Important folders/files:

- `index.html`, `styles.css`, `app.js`: customer website and visual prototype.
- `web-config.js`: root static website's public Supabase config; currently blank.
- `web-backend.js`: root website Auth/REST/Edge Function helper added during Phase 4; must be reviewed and exercised before use.
- `assets/`: Amar Bazar logo, delivery photography, fonts, product/category/restaurant images.
- `rider.html`, `rider.css`: rider-oriented visual page/source; do not assume secure rider account or live assignment integration.
- `apps/admin/`: staff dashboard React/Vite app, `.env.example`, TypeScript setup and UI.
- `apps/customer/`: Android Expo app, `app/` routes, `components/`, `context/`, `lib/`, local product/media assets, Expo/EAS config.
- `supabase/config.toml`, `supabase/seed.sql`: Supabase local project configuration and development sample data.
- `supabase/migrations/`: SQL schema, role/RLS, workflows, admin and delivery operations.
- `supabase/functions/`: Edge Functions and helpers; no private values belong in checked-in source.
- `docs/audit/`: Phase 0 reports.
- `docs/architecture/`: Phase 1 design.
- `docs/backend/`: Phase 2 schema/API/auth/RLS/migration documentation.
- `docs/admin/`: admin user guide and feature status.
- `docs/customer/`, `docs/orders/`: customer and order workflow guides added during Phase 4.
- root Markdown files include setup, test, deployment and release notes; inspect them before duplicating.
- `.github/`: GitHub Pages workflow/configuration. Existing Pages deployment is for the static site. GitHub Pages is a preview/static hosting surface and should not be assumed to be a suitable production commerce host.

### Database and security model in source

Migration schema includes customer profiles and saved addresses; private admin profiles/roles (`admin`, `order_operator`, `catalog_manager`); shops/categories/products/inventory/delivery areas/store settings; orders/order items; quote checks and customer decisions; order events/status history; COD, stock movements; notification outbox/logs/webhook events; and delivery assignments. Prices and item labels are snapshotted in orders. RLS is enabled for the business tables and staff write functions enforce roles.

This is a source-level description only. The schema, RLS policies, grants, SQL functions, Edge Functions and Storage rules have not been run against a real staging database in the accessible session. Perform staging migration review and negative permission tests before enabling any live user.

### Migration files observed

1. `20261106000100_schema.sql` — initial schema, roles, RLS and grants.
2. `20261106000200_order_workflows.sql` — create order, quote, customer decisions, inventory and COD transactions, staff operations.
3. `20261106000300_catalog_admin.sql` — catalog/shop/area/settings functions and product media bucket/policies.
4. `20261106000400_customer_realtime.sql` — optional order Realtime publication.
5. `20261107000500_admin_dashboard_whatsapp.sql` — staff role query, notifications and dashboard support.
6. `20261109000600_delivery_assignments.sql` — assignment history and dispatch guards.
7. `20261110000700_admin_management.sql` — admin audit, customers/staff lists, dashboard metrics.
8. `20261111000800_customer_cancellation.sql` — customer cancellation RPC for pre-confirmation statuses.

The checked-in seed is for local/staging development only. Never run destructive reset/seed against production.

## 6. Application status by feature

### Customer website (Phase 4 in progress)

**Prior code:** product/category data hard-coded in `app.js`; cart and demo orders saved in Local Storage; local fake staff panel and approval statuses shared the same browser data. Not a real order service.

**Current local Phase 4 source changes (uncommitted):**

- `app.js` imports `web-backend.js`, loads Supabase catalog/areas/settings when config exists, retains local storage for cart only, presents OTP before submitting, creates orders via Edge Function, displays order status/history, supports customer quote decision and account/order/address UI.
- `web-backend.js` implements public client config use, Auth OTP and session token refresh, REST reads/profile/address operations, `create-order`, quote decision and cancellation calls.
- `web-config.js` is blank, so current local checkout remains preview-only and no live service can be called. Do not insert credentials based on guesses.
- `index.html` adds account/history/product detail surfaces and uses a module script.
- `supabase/functions/customer-cancel-order/index.ts` plus migration 8 add owner-scoped cancellation before confirmation.
- `docs/customer/CUSTOMER_GUIDE.md`, `docs/orders/ORDER_WORKFLOW.md`, `docs/orders/ORDER_STATUS_REFERENCE.md` document intended flow.

**Checks actually run in the latest Phase 4 work:** `node --check app.js`, `node --check web-backend.js`, and `git diff --check` passed before the handover was generated. These checks verify parsing/whitespace only; they do not prove the website works in a browser or the backend integration works. No browser flow, SMS OTP, Supabase request, customer CRUD, order lifecycle, slow network, mobile layout, or server-side authorization test has run. No screenshot has been captured in this Phase 4 turn.

**Review carefully before staging test:** session persistence/token refresh, RLS column/table grants, function JSON error mapping, public storage image URL encoding, item filtering, protected order history, cancellation rules, and whether demo code can still accidentally display/action fake records. Never leave sample listings displayed as real when backend config is present but catalog fetch fails.

### Admin dashboard (Phase 3 source work)

Modules in local source: overview/metrics, order search/detail and quote verification, products + image upload, categories, shops, inventory adjustment/history/low stock, customer list, delivery assignment/status, COD collection, reports, staff/roles, audit log, notifications/retry, store settings. Role gate and backend RPC/function calls are present.

**Checks recorded from prior turn:** TypeScript project build passed; Vite production bundle passed (74 modules). `git diff --check` passed with line-ending warnings. Browser preview was attempted; in-app browser could not reach the local Vite preview (`ERR_CONNECTION_TIMED_OUT`). No visual screenshot was obtained. No DB CRUD, role matrix, image upload, stock concurrency, order transitions, COD, audit or RLS test passed because Supabase and local DB tools/config were unavailable.

See `docs/admin/ADMIN_FEATURE_STATUS.md` and `docs/admin/ADMIN_USER_GUIDE.md`. Dashboard source completeness does not equal backend acceptance.

### Android customer app (Phases 2–4 source work; release not ready)

Expo Router screens include onboarding/home/categories/search/product detail/cart/checkout/success/order history/order tracking/profile/address management/auth. Supabase client uses public `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Cart uses AsyncStorage; order operations use Edge Functions and database queries in source. No rider app is part of release one.

The user previously reported installing an APK successfully after setting up Node and EAS login, but exact APK artifact/commit and later runtime state were not independently checked in this handover. Google Play Protect warned about an unknown developer; user chose to install anyway and later reported “success.” This is not a Google Play release. Earlier Expo Go produced “Something went wrong” and “Failed to download remote update”; the exact root cause was not conclusively established. Do not repeat network troubleshooting without inspecting current project/device logs.

No current EAS cloud build, Play submission, production backend configuration or full Android end-to-end acceptance is confirmed. Build commands require a working Node/pnpm setup; do not install packages unless specifically approved/needed.

## 7. Phase history and prompts

The owner supplied a phased plan and expects phase-by-phase review/approval.

### Phase 0 — Technical audit

Requested repository/code inspection, identify static website, Local Storage, admin and Supabase status; create six audit reports; do not change application source. Reports present under `docs/audit/`: project audit, feature status, backend readiness, security audit, development roadmap, testing checklist. Stated evidence gaps rather than claiming live connectivity.

### Phase 1 — Architecture

Requested production architecture for website/admin/Android with one shared Supabase, environments, roles, hosting/domain, Git strategy, costs; create five docs under `docs/architecture/`; no Phase 2 without owner approval. Architecture documents are present. They are proposals, not infrastructure execution.

### Phase 2 — Supabase backend

Requested inspect/reuse existing code, schema/RLS/functions, transaction-safe order workflow, migrations, docs, local/staging tests; never touch live DB without approval. Migrations, Edge Functions and `docs/backend/` exist in source. Live migrations and acceptance tests are not verified.

### Phase 3 — Admin management

Requested functional React admin for catalog/orders/customers/delivery/COD/reports/staff/settings and WhatsApp notification review. Local code and docs added. TypeScript/bundle checks passed; DB integration/permissions remain unverified. No production deployment.

### Phase 4 — Customer website and end-to-end operations

Owner prompt asks preserve static HTML/CSS/JS design; replace Local Storage as authoritative order storage; support catalog/search/product details/cart/Auth/profile/address/checkout/order history/tracking/quote approval; server validates prices, stock, quantities and fees; prevent duplicate requests; audit workflow; mobile/slow network/form checks; docs; test complete customer-to-delivery and do not start Phase 5 until owner approval.

Current work adds a web client and cancellation path, but has not passed runtime acceptance. The root `web-config.js` deliberately stays blank until a staging project is supplied/configured. **Next work is finish code review and connect an isolated staging project, then execute acceptance tests.**

### Future phases discussed

- Phase 5: deployment/release or expanded roles/WhatsApp depending on the owner's current plan. Earlier separate Phase 5 admin/WhatsApp prompt exists in the conversation and `PHASE_5_TESTING.md`; do not assume it is the next approved phase because the most recent explicit phase prompt is Phase 4 and demands approval before advancing.
- Phase 6: full QA/security audit.
- Phase 7: Android release/deployment. Do not publish without approval.
- Potential future seller/restaurant owner role and receiver/rider experience: undecided, should be designed after core verified flow.

### Other important troubleshooting/visual history

- The user asked to see app UI and tried Expo Go by QR/URL. Expo showed blue error screen; error log included `java.io.IOException: Failed to download remote update`. Metro/package appeared running and both devices shared Wi-Fi per user, but this did not resolve it. Avoid claiming the QR was tested successfully.
- Node.js was initially not recognized in PowerShell. User installed Node; PowerShell execution policy blocked `npm.ps1`. Later user logged into EAS in browser and reported authentication success. For a fresh laptop, reopen terminal after Node install; use `node.exe`, `npm.cmd`/`npx.cmd` if PowerShell policy blocks `.ps1`. Do not recommend changing machine-wide execution policy without need.
- Android install once showed Play Protect “App blocked to protect your device” because developer was unknown. User then reported “App not installed,” followed later by “success.” Exact build/install result was not verified independently.
- Root marketing website had repeated mobile hero layout/image issues. Changes exist in previous GitHub commits (`30c94d0`, `91e2bb3`, `b280a27`) and local current source. Latest verified GitHub commit is the mobile hero text-column fix.
- GitHub Pages earlier showed 404; user later said “success.” Treat current published URL as owner-reported, not independently checked in this turn.

## 8. ChatGPT, Codex, VS Code and GitHub workflow

This is the intended and historically described relationship, not proof of automated synchronization:

- **ChatGPT:** captures owner decisions, plans phases, reviews requirements, writes clear Codex work instructions, helps debug and summarizes verified outcomes.
- **Codex Desktop:** inspects and edits the attached local repository, runs approved local build/check commands and reports changed files/evidence. It does not automatically have the user's external tokens or a remote database connection.
- **VS Code:** user opens the local repository, reviews diffs and files, edits if desired, uses terminal and Git UI/CLI. Keep one known repo folder open; verify before changing directories or copying files.
- **GitHub:** source backup, commits/branches/history and GitHub Pages static deployment. A local edit does not automatically update GitHub. It updates remote only after explicit commit + push or a configured workflow. GitHub Pages deployment then follows the repository workflow; confirm its run/status.

Typical safe workflow:

1. Open the repository root in VS Code/Codex; inspect `git status` and current branch.
2. Review current project docs and actual source before making edits.
3. Make one focused change; inspect diff and run relevant check(s).
4. Owner reviews UI/behavior and approves phase completion.
5. Only with explicit authorization, commit the intended files and push to `origin/main` or an approved feature branch. Check GitHub Actions and deployed URL afterward.
6. Never commit `.env` files, service-role keys, Meta tokens, actual customer records, unverified claims, or large generated artifacts without review.

**Current sync finding:** The checked-out `main` is at `b280a27` and `origin/main` matched it at inspection. Local working tree contains modifications/untracked files (including all major phase source, docs and new Phase 4 code). Those local changes are not in GitHub as of the inspection. No commit or push was performed for them. Do not say current Phase 4 code is live on the public site.

## 9. Git and deployment facts

- Remote: `origin` → `https://github.com/almazid82/amar-bazar-amishapara.git` (read from local Git config).
- Branch: `main`.
- Latest local/origin commit observed: `b280a27 Fix mobile hero text column`.
- Prior commits observed: `91e2bb3 Raise mobile welcome content`; `30c94d0 Create photo-led mobile welcome layout`; `3e74033 Merge branch 'main' ...`; `1e46d97 Update README.md`.
- No branch/worktree for Phase 4 was observed; it is work on dirty `main`.
- No commit/push/deployment was made in the current task.
- Existing `.github/` workflow should be inspected before any publish. GitHub Pages hosting previously served the root static storefront per README/owner report. Admin, Supabase functions/database and Android app are not automatically deployed by a root GitHub Pages workflow.
- For transactional commerce, architecture proposes a static host suited to commerce (e.g. Cloudflare Pages) and separate admin origin, shared Supabase, but host/domain remain owner decisions and were not provisioned.

## 10. Development environment restoration on a new laptop

### Verified vs recommended

- **Previously verified on this laptop:** local project exists at the path in the header; Git repo has `origin`; Node tooling was later made available to Codex runtime. The user reported Node installation and EAS browser login success.
- **Not verified on the new laptop:** Windows version, Git, Node version, pnpm, VS Code, EAS credentials, Expo CLI, Android Studio/emulator, Supabase CLI/Docker/Deno, environment files or account authentication.
- **Recommended:** install Git, current Node LTS, VS Code, pnpm (project uses `pnpm-lock.yaml` under both subapps), Android Studio only if using emulator, and Supabase CLI/Docker only for a local Supabase stack. Avoid duplicating entire `node_modules`; install from lockfiles after confirming approval/network.

### Restore source safely

1. Install Git and sign in to GitHub using the owner's account.
2. Clone `https://github.com/almazid82/amar-bazar-amishapara.git` into the agreed workspace. This remote currently contains only through the verified remote commit, not this dirty workspace's Phase 0–4 docs/code.
3. Before transplanting anything, preserve the original local working tree as a backup. Compare it with GitHub; do not overwrite the new clone with an older snapshot or reset either copy.
4. Transfer current local work through an owner-reviewed patch/branch or approved remote push. Review private files before transfer.
5. In VS Code, open the repo root and check the active branch, remotes, file status and `.gitignore`.

### Restore individual environments

- Admin local env template: `apps/admin/.env.example`, names `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Android local env template: `apps/customer/.env.example`, names `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Functions template: `supabase/functions/.env.example`; server-side names include `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AMAR_BAZAR_WORKER_SECRET`, and Meta-related variables described in `WHATSAPP_SETUP.md`. Never place service role or Meta secrets in a client config.
- Root web client: `web-config.js` has intentionally empty public `supabaseUrl` and `supabasePublishableKey` fields. Configure only for local/staging after the correct project and Auth redirect are known.
- No `.env` files/values were found in the environment variables inspected during Phase 3. Do not assume EAS or remote Supabase settings are absent; those were not inspected.

Potential local commands after setup (do not run against production):

```powershell
# Admin dashboard
cd apps/admin
Copy-Item .env.example .env
pnpm install --frozen-lockfile
pnpm dev

# Android app
cd ../customer
Copy-Item .env.example .env
pnpm install --frozen-lockfile
pnpm start
```

The `.env` files need valid local/staging public URL/key before live calls. For root website, serve via `http://localhost` (not `file://`) because ES modules and browser auth need an origin. Do not submit real data from preview mode.

## 11. Current task status

| Item | Status | Evidence / limitation |
|---|---|---|
| Local project/repo identified | COMPLETED | Repo root and Git metadata inspected. |
| Root static storefront/design | COMPLETED as prototype | Source exists; deployed site status only owner-reported. |
| Phase 0 audit docs | COMPLETED as source audit | Six files under `docs/audit/`; live implementation remains unverified. |
| Phase 1 architecture docs | COMPLETED as proposal | Five files under `docs/architecture/`; no infrastructure was provisioned. |
| Phase 2 schema/functions/docs | IMPLEMENTED IN SOURCE / UNVERIFIED | Eight migration files/functions exist; no database execution or test. |
| Phase 3 admin dashboard | IMPLEMENTED IN SOURCE / PARTLY CHECKED | Admin typecheck and Vite build passed in prior turn; no database acceptance/browser screenshot. |
| Phase 4 web backend hookup | IN PROGRESS | New Supabase client, OTP, catalog/profile/address/order/quote/history/cancel source and docs. Blank config means no live integration. |
| Root JS syntax | CHECK PASSED | `node --check app.js` and `node --check web-backend.js` passed before this handover. |
| Phase 4 browser/mobile checks | PENDING | Not run; no screenshot. |
| Supabase connectivity and migrations | BLOCKED / UNVERIFIED | In earlier environment inspection, no Supabase CLI, Docker, psql, Deno, env values or authorized database were available. Recheck on new machine. |
| Real CRUD/Auth/RLS/workflow | PENDING | Requires isolated staging/local DB and synthetic users/catalog. |
| WhatsApp live integration | PENDING | Code/templates exist; Meta configuration, templates, delivery and retries unverified. |
| Android Play release | PENDING | No confirmed final artifact, production backend validation or Play submission. |
| GitHub state | DIRTY / UNSYNCED | `main` local HEAD matched origin at `b280a27`; local source/docs/migrations are modified/untracked and unpushed. |
| Developer credit | IMPLEMENTED IN LOCAL SOURCE | Website footer and admin view/login have highlighted developer credit; uncommitted. |

## 12. Risks and open questions — address in this order

1. **Preserve dirty work:** the project has extensive local changes that are not in GitHub. Back up/review them before changing branch, pulling, cloning over, or cleaning anything.
2. **Securely review the new static web auth client:** browser local storage holds the Auth session; ensure XSS protections/CSP and HTTPS before real customer data. Prefer Supabase-supported client behavior and test refresh/revoke flows. Never expose service role.
3. **Set up isolated staging:** establish project identity, Auth phone provider, redirect URL, migrations, functions and RLS under an explicitly non-production project. Do not point root web/admin/Android at production for first tests.
4. **Run migration validation:** SQL has only source inspection. Execute ordered migrations in disposable local or staging, then test all grants/triggers/RPCs and rollback behavior.
5. **Run negative security tests:** anon access, customer A reading customer B, customer attempts to update status/prices/role, catalog manager seeing staff/audit, order operator settings restrictions, and customer cancellation beyond allowed state.
6. **Run full order lifecycle:** request → shop quote → substitutions → customer approval/rejection/change request → reserve/release stock → prepare → assignment → dispatch → COD → delivered. Test duplicate submit and stale quote versions.
7. **Confirm business facts:** real shops, owner-approved catalog/photos/prices, delivery area names/fees, hours/cutoff, response SLA, min basket/fees, cancellation policy, COD process, SMS cost, licensed pharmacy partner if medicine planned.
8. **Improve website robustness:** loading/retry/no-results/empty states; persistent idempotency key behavior across re-entry; two-step OTP form behavior; malformed or expired session handling; area/time pricing display; slow network; accessible dialogs and screen sizes.
9. **Browser visual acceptance:** run local website on localhost and record real mobile and desktop screenshots, including no-config preview and configured staging. Current local preview was not verified in the prior attempt.
10. **Only then approve Phase 4; only after review, commit/push.** Use no production deployment until a separate plan and authorization.

Unresolved: Which delivery villages/fees are final? Does the published GitHub Pages site still load on owner devices? Is root web customer SMS OTP desired for pilot or should website orders remain manual WhatsApp until verified? Are shop owners to get accounts in this release, or will operators handle all shop checks? Does “receiver” mean a second recipient contact only? Who handles/assigns riders and records COD? What domain/host will production use? These need owner decisions before production rollout, not before staging code tests.

## 13. Prioritized continuation plan (Phase 4)

### Step 1 — Safeguard and inspect the working tree

- Review `git status`, branch and `git diff` before any edits.
- Back up current dirty files; do not reset or clean.
- Run `node --check app.js`, `node --check web-backend.js`, `git diff --check` again after edits.
- Review `web-backend.js` and current `app.js` closely; separate actual live behavior from preview-only fallback.
- Expected result: owner can review exact current delta and know which parts are only mock data.

### Step 2 — Finish source-level Phase 4 review

- Confirm config blank safely disables orders and sample catalog is labelled as preview.
- Verify customer can request OTP and order submission only happens after verification.
- Verify submission sends IDs/quantities and stable idempotency key, never trusts subtotal/fee/price.
- Ensure order history and addresses are owner scoped; quote decision/cancellation are backend functions.
- Review session token storage, refresh and logout, injected HTML escaping, URL handling, error/retry behavior and accessible form semantics.
- Expected result: code reviewed; any issues fixed before staging connection.

### Step 3 — Prepare isolated staging (owner provides/selects project)

- Confirm project ref and that it is not production. Configure public URL/publishable key only in local files/config not committed.
- Configure test SMS provider/OTP behavior and allowed callback origins; use synthetic accounts/numbers.
- Apply migrations in order and deploy functions; seed only synthetic/owner-approved catalog data.
- Verify RLS/grants and collect a backup/rollback plan. No service role in clients.
- Expected result: root web, admin and Android point at the same isolated project.

### Step 4 — End-to-end acceptance

- Anonymous browsing of active catalog/areas; unavailable data and errors.
- Customer A OTP, profile/address CRUD, order create and duplicate/retry; server totals vs known fixture.
- Customer B cannot read A profile/address/order; anon cannot submit order; customer cannot write prices/stock/roles/status.
- Admin verifies products/substitutions/prices, quote version changes, customer approvals/requests/reject/cancel.
- Confirm inventory reservation, rollback on a failing item, cancellation release and delivered consumption.
- Validate staff assignment, rider handoff view as designed, COD exact/partial/overpayment protections, history and notification outbox. No real customer/order records.
- Verify same order and states display consistently in web customer, admin and Android.
- Use slow-network throttling, small-screen layout and failed requests; capture screenshots and write results.
- Expected result: evidence-rich test report with pass/fail/unrun per item; no “pass” by source inspection alone.

### Step 5 — Owner review and GitHub sync

- Show preview/screenshots, changed files, test results and remaining gaps.
- Wait for owner Phase 4 approval before Phase 5.
- On explicit commit/push authorization, create an appropriately named commit/branch, push, verify GitHub Actions and the intended preview host. Do not publish customer transactions on GitHub Pages without resolving hosting suitability/policy.

## 14. Exact useful commands and setup notes

Current shell/workspace is Windows PowerShell. User has previously encountered missing `node`, missing `npx`, and PowerShell refusing `npm.ps1`. Node was later installed according to user, and an EAS browser message said login was successful. In a fresh shell first run `node -v`, `npm.cmd -v`, `pnpm -v`, `git --version`. If PowerShell blocks `.ps1`, try the `.cmd` shim (`npm.cmd`, `npx.cmd`) or invoke the installed executable; do not weaken global execution policy blindly.

Root website static checks:

```powershell
node --check app.js
node --check web-backend.js
git diff --check
python -m http.server 8081
```

Open `http://localhost:8081/`. Stop the server with Ctrl+C. A static server only proves files are served; it does not verify Auth/DB.

Admin scripts are in `apps/admin/package.json`: `pnpm dev`, `pnpm build`, `pnpm preview`. Android scripts are in `apps/customer/package.json`: `pnpm start`, `pnpm android`, `pnpm typecheck`, `pnpm check`. The exact current dependency versions are in each package.json/lockfile. No root monorepo script is configured.

Never print or paste secret values into chat. If a secret is required, set it directly in the local/staging secret manager or `.env` and report only its variable name/configured status.

## 15. Instructions for the next ChatGPT/Codex assistant

You are taking over an existing software development project.

Your first responsibility is to understand the complete project context before taking action.

Read this entire `MASTER_HANDOVER.md` document. Then:

1. Understand the project's objectives and requirements.
2. Understand the user's previous working relationship with ChatGPT, Codex, VS Code, and GitHub.
3. Identify the last verified development state.
4. Help restore the development environment on the new laptop.
5. Verify Codex access and required permissions.
6. Verify the correct GitHub repository and branch.
7. Inspect the actual codebase before making modifications.
8. Compare the actual code with the documented project status.
9. Identify incomplete and unresolved tasks.
10. Continue development from the last verified state.

Do not restart the project unnecessarily.

Do not overwrite existing work.

Do not assume previous local sessions or permissions have transferred automatically.

Do not make architectural changes without explaining their consequences.

Use Codex for authorized development tasks and GitHub for proper version control.

Keep the user informed about important changes and verify implementation results before declaring tasks complete.

Additional project-specific rules:

- Begin with `git status`, current branch, remote and last commit; preserve all dirty files.
- Owner's current phase prompt is Phase 4. Do not start Phase 5 before Phase 4's staging lifecycle acceptance and explicit approval.
- Do not use real customers, real orders or production data in acceptance testing.
- Never claim Supabase connectivity, OTP delivery, WhatsApp send, an APK/Play release, preview, deployment or successful test without direct evidence.
- Product copy stays English except the Bengali brand/logo. Developer credit is requested as Shamsul Al Mazid · Statistics, Dhaka College.
- Use concise Bangla explanations and one actionable next step when communicating with this owner.
- Do not commit/push/deploy/migrate production unless separately authorized.

## 16. Final handover checklist

- [x] Project identity, goals and village-pilot order model described.
- [x] Website, Admin, Android and shared Supabase source architecture summarized.
- [x] Implemented-in-source vs tested/live behavior distinguished.
- [x] Key Phase 0–4 scope and major troubleshooting history preserved.
- [x] Repository, branch, origin and latest observed commit recorded without inventing IDs.
- [x] Dirty/uncommitted Git status disclosed; no push claimed.
- [x] Environment variable names documented without secret values.
- [x] New-laptop restoration steps distinguished from verified prior setup.
- [x] Next Phase 4 staging/acceptance plan prioritized.
- [x] Inaccessible information, tests and live configuration marked unverified.
