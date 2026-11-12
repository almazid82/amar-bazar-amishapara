# Customer-to-Delivery Order Workflow

## State and responsibility sequence

| Step | Responsible role | System operation |
|---|---|---|
| WhatsApp draft created | Customer | Verified Auth session calls `create-whatsapp-order-draft`; server validates current products, quantities, stock, delivery area/fee, and calculates the estimate. Idempotency prevents duplicate drafts. The order is `pending_submission`; no order-received notification is queued yet. |
| Message sent and received | Customer, then staff | Customer reviews the prefilled message in WhatsApp and presses Send. WhatsApp does not report the Send action to the website. Staff moves the draft to `pending_verification` only after the message arrives. |
| Shop verification | Admin/order operator | Checks each requested line with the shop and records available/unavailable/substitute results and checked prices. |
| Quote sent | Admin/order operator | `save_order_quote` stores a versioned quote and computes final totals; order becomes `awaiting_customer_approval`. |
| Customer decision | Customer | Reviews the versioned items and total; approve, request changes, or reject via `customer-order-decision`. Stale quote versions are rejected. |
| Confirmation and stock reservation | Backend | Approval atomically reserves tracked inventory and creates COD due; order becomes `confirmed`. |
| Packaging and delivery | Admin/order operator | Marks preparing, assigns delivery, and transitions to out for delivery. Existing backend enforces delivery assignment before dispatch. |
| COD and completion | Admin/order operator | Records collected amount and marks delivered. Backend checks COD amount and releases/consumes reservations transactionally. |

## Customer cancellation

`customer_cancel_order` is restricted to the authenticated owner and the `pending_submission`, `pending_verification` or `awaiting_customer_approval` states. It locks the order, records cancellation and status history, and queues a notification only when the customer has opted in. Confirmed, preparing, out-for-delivery, delivered, and already-terminal orders cannot be cancelled by this customer endpoint.

## Data and retry rules

- The browser sends product identifiers and quantities, not authoritative prices or totals.
- Order item rows snapshot requested product name, unit, and price; the quote stores final verified prices.
- The order ID and public code come from the database response.
- The browser retains the same idempotency key for the same pending submission retry. A changed payload with that key is rejected by the backend.
- Notification delivery is asynchronous/outbox-based and does not determine whether order creation succeeded.

## Verification status

This workflow is documented from source migrations/functions and website calls. It has not been exercised against a running Supabase database. Staging acceptance must cover each transition, stock rollback, owner-only access, quote version conflicts and retry behavior before production use.
