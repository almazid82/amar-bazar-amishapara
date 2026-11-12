# Amar Bazar — Feature Status

Legend: **Implemented in source** = code path exists; **Prototype** = local/demo only; **UNVERIFIED** = runtime/backend behavior not exercised; **Missing** = no implementation found in the inspected project.

| Feature | Root website | Android customer app | Admin dashboard / backend |
|---|---|---|---|
| Product/category browsing | Prototype; hard-coded listings | Implemented in source; Supabase query, connection unverified | Catalog read/edit source exists; runtime unverified |
| Product search/filter | Prototype, in-memory | Route/source exists; typecheck passed | Order search/filter source exists |
| Restaurant menu sections | Prototype, sample menu | No separate restaurant partner menu flow verified | Shop/catalog tables and shop admin actions exist |
| Cart | Prototype, localStorage | Implemented; AsyncStorage persistence | N/A |
| Delivery areas/fees | Hard-coded pilot list; flyer-derived | Database query and checkout area selection source exists | Area management RPC/UI source exists |
| Customer identity | Missing | Supabase Auth source, phone OTP/email flow to verify against configured Auth | Supabase email/password login source |
| Checkout | WhatsApp Click-to-Chat with validated dynamic message; live draft function source exists, backend connection unverified | Server function call, validation and idempotency source exists | Order queue source exists |
| Shop price/availability verification | Same-browser simulation | Explainer and quote view/decision source exists | Quote verification and phone-outcome actions source exist |
| Customer quote approval | Simulated localStorage action | Edge Function + SQL decision source exists | Can record staff phone outcome |
| Order history/tracking | Same-device local order only | Order list/detail/status history query source exists | Realtime queue and status actions source exist |
| Inventory | Missing | Read-only availability display | Stock adjustment and transactional reservation/consume/release source exists |
| COD | Informational/demo only | COD checkout UI; backend gating source exists | COD collection operation source exists |
| Delivery status | Partial local demo through preparing | Display/status source exists | SQL supports out-for-delivery and delivered; live UI path unverified |
| WhatsApp | Dynamic customer Click-to-Chat message plus server draft source; number config present, real send unverified | No direct Meta secret use found in mobile client | Outbox worker, official Graph API call, webhook and retry source exist |
| Admin security | None in root preview | No admin features expected | Auth + staff role checks + RLS source; live auth unverified |
| Map/location | Optional browser geolocation and Maps link | Address supports coordinates; no map picker confirmed | Address details view; live map feature not confirmed |
| Deployment | GitHub Pages workflow source exists | EAS config exists; build artifact not verified here | No separate admin deploy workflow confirmed |

## Root local prototype limitations

The root page still has a preview-only staff panel backed by browser storage. The new WhatsApp path persists a `pending_submission` draft only when a staging Supabase project is configured and its migrations/function are deployed; otherwise it uses a temporary reference and never claims a saved order. End-to-end database and WhatsApp behavior remain unverified here.

## Runtime status

- Root JavaScript parse: **PASS**.
- Admin TypeScript check/build: **PASS** locally.
- Customer TypeScript check: **PASS** locally.
- Manual browser interaction: **NOT RUN**; local socket access was denied by the current environment.
- Backend interaction: **UNVERIFIED**; no local project config, Supabase CLI or authorized staging access was available.

No real orders or production accounts were created.
