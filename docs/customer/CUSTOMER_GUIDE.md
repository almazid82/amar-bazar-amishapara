# Amar Bazar Customer Website Guide

## WhatsApp ordering

Checkout validates name, Bangladesh mobile number, delivery area, address, non-empty cart and positive integer quantities. It builds a message from the current cart with each shop, item, quantity, listed price estimate, area fee estimate, customer details, date and an order reference. WhatsApp opens with the message prefilled; the customer must review it and press **Send**. Opening WhatsApp is never treated as a sent or confirmed order.

The public business number is centralized in `web-config.js` as digits-only `8801884989479`, confirmed by the owner as the WhatsApp Business number on the flyer. The supplied WhatsApp short link is retained as support/fallback. Very long messages use a copy-and-paste fallback. Preview mode creates only a temporary reference and does not save an order.

With staging Supabase configured, the customer verifies their phone and the site stores a server-priced `pending_submission` draft before opening WhatsApp. Staff marks the draft as received only after seeing the WhatsApp message. WhatsApp does not provide a callback to tell the website whether the customer pressed Send.

## Live mode setup

The root website remains static HTML, CSS and JavaScript. It uses the shared Supabase project through its public publishable key and the customer's Auth session. It does not use a service-role key. Set `supabaseUrl` and `supabasePublishableKey` in the root `web-config.js` to a **local or staging** project after its ordered migrations and Edge Functions are available. Both values are browser-visible; database RLS and function authorization are required.

Leave these values blank for the design preview. In preview mode, the illustrative catalog remains visible but checkout cannot create or simulate an order. A configured live catalog error hides the sample products to avoid presenting sample prices as real.

Serve the repository root over `http://localhost` (not `file://`) so ES modules, Auth redirects and browser storage work. For example, use VS Code Live Server or `python -m http.server 8081`, then open `http://localhost:8081`. Configure the same URL as a local Supabase Auth redirect/site URL where required. For GitHub Pages, never add private keys; only the publishable key may be present, and use production only after separately approving that environment.

## Customer flow

1. Browse active products and categories loaded from Supabase; the cart is persisted locally as a temporary convenience.
2. Review a product detail card, set quantities and choose a delivery area.
3. Enter recipient and address, then request an SMS one-time code. The website submits no order until the customer verifies the phone.
4. The website sends product IDs and quantities, an idempotency key and delivery details to `create-order`. The database computes prices, stock availability and the delivery fee. Browser subtotal figures are estimates only.
5. The order is stored as `pending_verification`. The customer can review its status and history from Account → Order history.
6. After staff checks shop stock and creates a quote, the customer opens the order and approves, requests changes, or rejects. Rejecting a quote cancels the order.
7. A customer can cancel an order while it is `pending_verification` or `awaiting_customer_approval`. Later cancellation must go through support/staff policy.

## Profile and addresses

Phone verification signs the customer into Supabase Auth. Account lets the customer edit their display name, list/add/remove their own delivery addresses and access their private order history. RLS is expected to restrict those records to the signed-in customer.

## Retry and privacy

An in-progress idempotency key is kept in session storage so a retry after a network interruption can safely replay the same order request. The order itself is never saved to browser Local Storage. The customer JWT is persisted by this static browser client in local storage; protect the site against script injection, use HTTPS outside local development, and consider a server-rendered HttpOnly-session architecture before handling substantial production traffic.

The public catalog contains only active listings. Customer phone, address and order history require a verified session and backend RLS. Product and order values displayed before server confirmation are estimates and must not be treated as a final payable amount.

## Current limitation

No staging Supabase project is connected in this checkout. Live data, SMS delivery, profile CRUD, address CRUD, order submission and order decisions remain unverified until configured and tested with synthetic accounts/data.
