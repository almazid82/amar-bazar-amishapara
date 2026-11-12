# Amar Bazar WhatsApp Ordering

## Customer flow

1. The customer selects products, quantities and a delivery area, then enters name, Bangladesh mobile number, address and optional instructions.
2. The website checks required values and quantities, then builds the message from the current cart. It lists each shop, line quantity, price estimate, subtotal, delivery estimate, estimated total, customer details, Bangladesh-local time and reference.
3. If the shared Supabase backend is configured, the customer verifies their phone first. `create-whatsapp-order-draft` validates products, stock, delivery area and prices on the server, stores a draft and returns its reference. The status is `pending_submission`.
4. WhatsApp opens with the message in the compose box. The customer reviews and presses **Send** themselves.
5. WhatsApp does not notify the website that Send was pressed. Staff confirms receipt only after seeing the chat, then moves the order to `pending_verification` in the Admin Dashboard.

The page never treats a link opening as a sent message or confirmed order. The cart is preserved. A customer can cancel a backend draft from order history. A preview-only order receives a temporary reference and is not saved.

## Configuration

The browser-visible settings are in the root `web-config.js`:

- `whatsappBusinessNumber`: digits only, international format, no plus or punctuation. Owner-confirmed value: `8801884989479`.
- `whatsappSupportLink`: the existing business support short link supplied by the owner. Used for support and the copy-and-paste fallback.
- `supportPhone`: public contact number used by the call fallback.

Only public contact data belongs in this file. Never put Supabase service-role keys or Meta API credentials here. The order CTA uses the official `https://wa.me/<number>?text=<encoded-message>` format.

For live draft persistence, apply migrations in order and deploy `create-whatsapp-order-draft`. The customer app also needs its local/staging `supabaseUrl` and `supabasePublishableKey` in `web-config.js`; keep the service-role key server-side. SMS verification and the `orders_enabled` store setting must be configured in that Supabase project.

## Duplicate and failure handling

- The message reference remains stable while the same form and cart are retried in one page session.
- Live drafts use a UUID idempotency key and the database rejects a retry that changes the payload under the same key.
- Invalid inputs prevent handoff and leave the cart unchanged.
- If the configured WhatsApp number is invalid or the encoded URL is too long, the page presents the full message for copying and opens the supplied support chat.
- If a browser blocks the new tab, the page provides a direct **Open WhatsApp again** link.
- Network/backend failures do not clear the cart. A successfully created draft can be loaded again with the same idempotency key.
- A customer who closes WhatsApp without sending leaves a `pending_submission` draft; staff must not verify it or begin fulfillment.

## Known limits and later work

- Click-to-Chat requires the customer to send manually and provides no delivery receipt to the website.
- In a disconnected preview, product prices and delivery fees are illustrative estimates and a reference is not a saved order.
- If a live draft exists but the customer never sends the message, it remains pending until the customer or staff cancels/expires it under the order policy.
- Official Meta Cloud API notifications can be added later for server-to-customer updates with consent and approved templates; they do not replace the customer's manual Click-to-Chat send.
