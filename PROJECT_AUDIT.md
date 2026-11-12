# Amar Bazar Project Audit

**Audit scope:** local website project and its assets, with the live GitHub Pages site as its published context.  
**Project status:** static pilot prototype.  
**Target rebuild:** Android-first customer app using React Native, Expo, and TypeScript; Supabase-backed data; separate web admin dashboard; no rider app in release one.

## Executive summary

The current project is a hand-built static website using HTML, CSS, and browser JavaScript. It is useful as a product and workflow reference: it contains a pilot catalog, restaurant menus, area-based delivery estimates, a simulated cart and checkout, a shop-verification/customer-approval sequence, a local staff preview, and branding and product imagery. GitHub Pages publishes the files as a static site.

The most important architectural distinction is that the order workflow is a **single-browser prototype**, not a live ordering system. The site stores carts and orders in `localStorage`; it has no server, shared database, staff authentication, order notifications, payment integration, inventory synchronization, or operational dispatch. A real Android app and admin dashboard need shared authoritative data and server-enforced permissions before they can accept real orders.

## 1. Existing architecture and project structure

### Technologies

- Semantic HTML in `index.html` and `rider.html`.
- Hand-authored CSS in `styles.css` and `rider.css`, including responsive breakpoints and motion preferences.
- Plain browser JavaScript in `app.js`; no framework, modules, TypeScript, bundler, or package manager is present.
- Browser `localStorage` for cart and order preview data.
- Google Fonts import for DM Sans and Playfair Display; system fallbacks are present.
- Google Maps embed and geolocation browser API for approximate area display and optional customer coordinates.
- GitHub Pages deployment workflow at `.github/workflows/deploy.yml`, triggered by pushes to `main` or manual dispatch.

### Repository layout

| Path | Purpose |
| --- | --- |
| `index.html` | Main marketplace page, product list mount point, map, customer checkout/order/admin dialogs, support links |
| `app.js` | Sample catalog, delivery fee data, rendering, cart, checkout, order status, customer preview approval, staff preview |
| `styles.css` | Site design system, responsive styles, catalog, dialogs, and mobile/desktop layouts |
| `rider.html`, `rider.css` | Static rider recruitment / information page; not an operational rider application |
| `assets/amar-bazar-logo.svg`, `assets/amar-bazar-mark.svg` | Brand artwork and symbol |
| `assets/fonts/` | Codepotro Abu Sayed TTF and OFL license text |
| `assets/delivery/` | Hero, journey, rider and customer delivery visuals |
| `assets/products/` | SVG category illustrations and product/restaurant image library |
| `.github/workflows/deploy.yml` | Static GitHub Pages publishing workflow |
| `README.md` | Project overview, pilot positioning, and contact information |

There is no `package.json`, dependency lockfile, native Android project, Expo configuration, API server, schema/migrations, or automated build pipeline for an application bundle.

## 2. Branding and design system

- **Brand:** Amar Bazar / আমার বাজার; the logo is Bengali, while most interface copy is English.
- **Visual direction:** neighborhood grocery and food service, with forest green, leaf/mint green, warm cream, tomato red, and yellow accents.
- **CSS tokens:** forest `#174d32`, secondary forest `#236644`, tomato `#d9553c`, sun `#f1bf4a`, cream paper `#fffefa`, and dark green ink `#1d2d24` (defined in `styles.css`).
- **Typography:** DM Sans for body/interface; Playfair Display for selected editorial emphasis. The Codepotro Abu Sayed font file exists, but the current CSS does not declare it with `@font-face`; Bengali wordmark text uses system Bengali font fallbacks. Logo SVG artwork should remain the source of truth for the brand mark rather than recreating it from text.
- **Reusable patterns:** pill category filters, product cards, restaurant menu expansion, cart drawer, modal forms, order status timeline, delivery-area fee selection, map preview, support actions, and compact mobile layouts.
- **Motion/accessibility:** CSS includes card/interaction transitions and a `prefers-reduced-motion` override. HTML has some labels and accessible names, though keyboard focus handling, modal focus trapping/restoration, and screen-reader testing need a deliberate pass in the native and admin implementations.

## 3. Product catalog, categories, images, and information

The prototype defines 10 browse categories: Everything, Food, Groceries, Snacks, Drinks, Rice & grains, Cooking oil, Spices, Daily needs, and Restaurants.

The in-code catalog contains 12 illustrative non-cafe products/restaurant samples plus 59 Half Time Cafe menu entries transcribed from supplied menu images (71 records total in the current source). Named restaurant groupings include Half Time Cafe, Foodi Goodi, and Royal Restaurant & Kebab Ghor. The Half Time Cafe records are grouped by menu category, have listed prices and units, and carry a note that availability must be confirmed. Grocery/daily-needs examples are explicitly marked as demonstration listings; several restaurant prices are sample values.

Product photographs and category illustrations are stored under `assets/products/`. The repository includes distinct food imagery for many restaurant items and general grocery images. Some menu entries intentionally reuse a category/serving photo (for example, several appetizer or duck items), so these images should not be treated as verified item-level photography. The website has no product database, SKU/barcode, stock count, tax, variant/size, brand, dietary/allergen, or reliable source metadata model.

**Reuse:** product names, menu categories, sample prices, units, restaurant grouping, and image files can seed a reviewed import sheet or initial database. Confirm each item, price, unit, image rights, availability, and shop relationship with the partner before these become customer-facing live data.

## 4. Cart and checkout behavior

- Search filters products by product name, shop, category, and restaurant menu category. Category chips filter the rendered catalog.
- Customers can add items to cart and increment/decrement quantities. Cart data persists in the same browser using `localStorage`.
- Checkout collects name, Bangladesh mobile number, delivery area, address, optional landmark and note, and optional geolocation coordinates.
- Area selection immediately adds the configured pilot delivery estimate to a sample-price subtotal.
- Submitting creates a locally stored order reference, clears the local cart, and presents an order tracking/confirmation preview.
- The copy correctly indicates that the order is only a request: the team should confirm stock and final prices, contact the customer, and proceed only after customer approval.
- Customer approval, change request, cancellation, status progression, and staff shop-check actions are simulated in the page. No order is sent to staff, shop, phone, WhatsApp, email, or a server.

## 5. Delivery pricing and location rules

`app.js` currently contains 31 named delivery areas with fixed pilot fee estimates, generally between ৳50 and ৳120. Selecting an area updates the displayed delivery fee and estimated total. The in-code comment explicitly says to confirm the values with the owner; these should be treated as draft/pilot data, not authoritative rates.

The map is an approximate Google Maps embed centered on a search for Amishapara Bazar, with a separate user-supplied shared map link. It is not a delivery polygon or address validator. Geolocation is optional and browser-permission-dependent. Coordinates are only saved to the browser’s local order record and linked to a Google Maps search in the staff preview.

The new system should make service areas, active/inactive coverage, fee rules, and effective dates admin-managed data. Before implementation, confirm the authoritative spelling/list of villages, fee table, whether fee depends only on village or also on distance/order type, and the market’s exact map pin. Display estimates transparently and recalculate server-side at order creation.

## 6. Customer-facing features present

- Brand header, pilot/verification announcement, responsive hero and delivery imagery.
- Catalog browsing, category selection, text search, restaurant grouping, featured items, and expandable “View menu” sections.
- Persistent local cart, delivery details form, area estimate, optional location sharing, and simulated order timeline.
- Phone and WhatsApp support links.
- Delivery-process explanation, local map preview, service-area messaging, and rider information page.

## 7. Mobile responsiveness and reusable elements

The site has desktop, tablet, and mobile CSS breakpoints (primarily 900px, 800/760px, 640px, 520px, and 420px). The mobile landing experience is photo-led and has its own layout and benefits row. Catalog grids reduce to two columns on narrow screens, checkout fields stack, and restaurant menus remain expandable.

The HTML/CSS patterns can guide the React Native design system, but CSS itself is not directly reusable in React Native. Reuse the visual decisions, content hierarchy, color/type tokens, logo and image assets, wording, and interaction flow. The app should implement native navigation, safe-area handling, keyboard behavior, accessibility, loading/error/empty states, offline behavior, and device-size adaptation rather than porting web layout mechanics literally.

## 8. Dependencies and technical limitations

There are no installed application dependencies or package manifest. Runtime dependencies are the browser itself, remote Google Fonts, the Google Maps iframe, and browser geolocation/local storage. Consequently:

- Orders and carts are isolated per browser/device and can be cleared by the user or browser.
- Staff tools are publicly reachable in the client and have no authentication or role authorization. They are strictly a demo, not a secure admin panel.
- Browser state is editable by the customer and cannot be trusted for totals, status, availability, or approval.
- There is no server-side validation, rate limiting, audit trail, backup, data retention, privacy consent workflow, or protection against duplicate submissions.
- A phone/WhatsApp link is not a notification integration; calls are manual and no phone verification/OTP exists.
- The demo does not implement payments, refunds, stock reservation, substitutions requiring an actual customer response channel, delivery assignment/tracking, or reliable SLA calculations.
- Remote fonts/maps require connectivity and may introduce privacy, availability, and performance considerations.
- The current static deployment can host the prototype, but it cannot securely host privileged admin logic or service credentials.

## 9. Assets and business logic that can be reused

### Reusable after review

- SVG brand logo and mark; confirm which is the approved master artwork.
- Color palette, visual components, interface copy, and workflow concepts.
- Delivery and product images, subject to confirming source/usage rights and suitability/resolution for mobile.
- Product/menu records and 31-area fee table as **unverified seed data**.
- Order lifecycle vocabulary: request received → shop availability/price check → customer review/approval → confirmed → preparing → out for delivery → completed, with cancellation/change paths.
- Input concepts for customer contact, area, address, landmark, notes, and optional map coordinates.

### Not reusable as production logic

- `localStorage` data model and all client-side-only order/staff actions.
- Client-computed totals and client-selected order/status fields as trusted business data.
- The public staff modal as an admin-security pattern.
- Assumed delivery charge, sample product prices, or generic delivery estimates without business confirmation.

## 10. What must be redesigned or built for the Android app

1. **Expo/React Native foundation:** TypeScript app, navigation, environment configuration, native safe areas, Android permissions, application icon/splash, error/loading states, and release build setup.
2. **Customer identity and contact:** Decide whether guest checkout is allowed; validate phone numbers; implement OTP only if the business needs verified identities and can support an SMS provider. A manual second confirmation call can remain a separate order status/process.
3. **Shared backend:** Supabase project, schema, row-level security, migrations, storage buckets, server-side functions/policies, backups, and environment secrets. Never put the Supabase service-role key in the app.
4. **Core data model:** profiles/customers, delivery areas and fee rules, shops, categories, products/variants, price history, availability, carts (if persisted), orders, order items, shop checks, customer decisions, status events, and admin roles/audit events.
5. **Reliable order workflow:** Create a pending request with an immutable item/price snapshot; staff verify each shop item, substitute/remove unavailable products, set the final fee/ETA, and record who checked it; customer explicitly approves or requests a change; only then allow confirmation/preparation. Send status updates through an approved channel and preserve an auditable timeline.
6. **Admin dashboard:** Separate authenticated web app with role-based permissions for catalog, partner shops, prices/stock, service areas/fees, order verification, customer approval tracking, and operational reports. Do not expose admin controls in the customer app without authorization.
7. **Catalog operations:** Admin import/edit tools, image upload/optimization, availability toggles, unit/variant support, category ordering, and clear marking of unconfirmed/seasonal items.
8. **Location and delivery:** Confirm authoritative coverage and map pin; model village selection separately from optional precise coordinates; request location only on an explicit action; provide address-entry fallback; calculate delivery charges on the server; avoid claiming real-time tracking until a dispatch workflow exists.
9. **Payments and policies:** Decide cash-on-delivery versus mobile financial service/payment gateway, refunds/cancellation rules, delivery fee handling, privacy/consent, retention, and customer support operating hours. Payment integrations are intentionally not assumed in this audit.
10. **Quality and release:** Add unit/integration testing for price totals, fee rules, status transitions, and access control; verify Android devices/network conditions; define monitoring, analytics with consent, support procedures, and release/rollback process.

## Key technical risks

| Risk | Why it matters | Mitigation direction |
| --- | --- | --- |
| Treating prototype data as live truth | Prices, stock, and delivery fees are expressly provisional | Owner approval and dated source records before import |
| No shared order database | Current orders are invisible across devices | Supabase-backed order workflow and server-side validation |
| Public client-side staff panel | Anyone can alter local orders and mark stages | Separate admin app with authentication, roles, and row-level security |
| Manual verification without operational ownership | Customer expectations depend on timely shop and customer calls | Define operator queue, call scripts, response targets, escalation, and cancellation paths |
| Broad/ambiguous map coverage | The embedded map is approximate, not a service boundary | Confirm precise pin and approved village coverage; show only areas that can be served |
| Data/image provenance and catalog drift | Supplied/generated images and transcribed menus may not match products or current prices | Partner approval, source/rights notes, last-verified date, and easy catalog updates |
| Mobile network/device constraints | Rural users may have slower or intermittent connectivity | Optimize images, cache safe catalog content, make failures recoverable, and retain manual phone/WhatsApp support |

## Recommended rebuild sequence

1. Confirm the pilot scope and operating rules: target villages, fees, shop partners, catalog owners, order hours, call handling, cancellation/substitution policy, payment method, and who has admin access.
2. Approve a compact data specification and order state machine before building UI. Keep `pending verification`, `awaiting customer approval`, `confirmed`, `preparing`, `out for delivery`, `completed`, and `cancelled` transitions explicit.
3. Build the Supabase schema and access rules; seed only owner-confirmed areas, shops, products, and prices.
4. Build the customer Android app around browse → cart → area/address → request submitted → waiting for human checks → final quote → customer approval → status updates.
5. Build the separate web admin dashboard for verification and catalog/area management; test that customer accounts cannot perform staff actions.
6. Pilot with a small set of partner shops and service areas, track real order and fulfillment metrics, and revise fees/catalog before expanding coverage.

## Audit boundary

This is a read-only audit of the local static-site project and its repository files. No production source, database, external service, deployment, or Git history was changed by the audit. The only requested deliverable is this document.
