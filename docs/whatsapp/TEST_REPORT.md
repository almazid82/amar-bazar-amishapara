# WhatsApp Ordering Test Report

**Status:** source-level checks only. No real WhatsApp chat was opened or sent, and no Supabase backend is configured in this checkout.

## Executed checks

| Check | Result | Evidence |
|---|---|---|
| JavaScript syntax (`app.js`, `web-backend.js`, `web-config.js`, `whatsapp-order.js`) | PASS | `node --check` completed for all four files. |
| Message formatting, BDT totals, Bengali text and URL encoding | PASS | Pure-function runs covered two vendors, line quantities and estimated total, Bengali product name, Bangladesh phone normalization, invalid phone, missing name/address, empty cart, invalid quantity, unavailable product, URL encode/decode round trip, and overlong URL fallback error. |
| Admin Dashboard TypeScript and production build | PASS | `npm run build` in `apps/admin` completed (`tsc -b && vite build`). |
| Whitespace and patch check | PASS | `git diff --check` completed. |
| Supabase Edge Function/database draft persistence | Not run | No connected local/staging Supabase project or valid credentials. |
| Android Chrome, desktop WhatsApp Web, installed WhatsApp | Not run | Requires a real browser/device and customer send action. |
| Popup-block, long-message fallback and clipboard fallback | Not run | Requires browser interaction. |
| Product changes, stock conflict, duplicate backend request | Not run against a database | Requires staging fixtures and live schema. |

## Manual acceptance checklist

- [ ] One item; multiple products; multiple quantities; item removed; empty cart.
- [ ] Missing name, malformed Bangladesh mobile, missing area, missing address; cart remains unchanged.
- [ ] English and Bangla item names, punctuation, long address, optional instructions.
- [ ] Restaurant-only basket and mixed-vendor basket.
- [ ] Verify item sum, server draft subtotal, delivery fee and estimated total match.
- [ ] WhatsApp installed on Android, Android Chrome without app, desktop browser and WhatsApp Web.
- [ ] Confirm message is prefilled but not sent automatically; close WhatsApp and verify site never says confirmed.
- [ ] Double-click/retry uses the same draft and reference; changed form creates a new idempotency key.
- [ ] Stale/unavailable product, price/stock change and disabled orders are reported without clearing the cart.
- [ ] Admin marks `pending_submission` received only after seeing the WhatsApp message; customer can cancel a draft.

Do not claim full acceptance until these checks pass against a local/staging Supabase project and real WhatsApp clients. Do not test by sending an unsolicited message to the live business account.
