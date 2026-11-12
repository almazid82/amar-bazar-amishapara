# Amar Bazar backend API

**Status:** Contracts traced from source and migrations. Endpoints have not been invoked against a configured Supabase project in this environment.

## Client access pattern

- Android app and admin dashboard use Supabase JS with a public project URL/key and a user access token. The public key is not authorization; RLS and checked SQL functions are.
- Do not send `SUPABASE_SERVICE_ROLE_KEY` to any browser or mobile client.
- Customer reads use PostgREST tables under RLS. Customer writes that change orders use the Edge Functions below.
- Admin reads use narrow PostgREST queries under staff RLS. Admin business mutations call `order-operations`, which forwards the staff JWT to role-checked database functions.
- Root website has both a secure online checkout path and a WhatsApp draft path. Cart persistence uses Local Storage; authoritative WhatsApp drafts are stored by the backend when configured.

## Customer functions

### `POST /functions/v1/create-order`

Requires a valid customer bearer token, publishable `apikey`, and UUID `Idempotency-Key`. Body has `areaId`, `addressId`, 1–30 `{productId, quantity}` items and optional note. Prices, fees and totals are not accepted as authoritative input. Returns order ID/public reference, status and server-calculated estimate. Same key and same canonical body is replay-safe; same key with changed body returns conflict.

### `POST /functions/v1/create-whatsapp-order-draft`

Requires a valid customer bearer token, publishable `apikey`, and UUID `Idempotency-Key`. Accepts the same fields and validates/calculates through the shared database order logic. Creates an order in `pending_submission` and returns a server-calculated estimate. It queues no order-received notification. Staff must move it to `pending_verification` only after receiving the customer's manually sent WhatsApp message. The website cannot observe whether the customer pressed Send.

### `POST /functions/v1/customer-order-decision`

Requires the owning customer bearer token. Body: `{ orderId, quoteVersion, decision }`, where decision is `approved`, `changes_requested`, or `rejected`. Database verifies ownership/current quote. Approval performs stock reservation and COD setup in the database transaction.

## Staff function

### `POST /functions/v1/order-operations`

Requires a staff bearer token. SQL RPCs independently validate role, order state, ownership, quote version, values and locks; hiding UI actions is not a security control.

| `action` | Required fields | Database operation |
|---|---|---|
| `verify_quote` | `orderId`, `expectedQuoteVersion`, verified `items`, `deliveryFee`, optional `estimatedEta` | `save_order_quote` |
| `phone_outcome` | `orderId`, `quoteVersion`, outcome and note | `record_phone_outcome` |
| `transition` | `orderId`, `nextStatus`, optional reason | `transition_order` |
| `assign_delivery` | `orderId`, `driverName`, E.164 `driverPhone`, optional notes | `assign_order_delivery` (new) |
| `record_cod` | `orderId`, `amount`, optional note | `record_cod_collection` |
| `upsert_shop`, `upsert_category`, `upsert_product` | corresponding catalog fields | `admin_upsert_*` |
| `upsert_delivery_area` | area and fee fields | `admin_upsert_delivery_area` |
| `adjust_inventory` | product, nonzero quantity delta, reason | `record_inventory_adjustment` |
| `assign_staff_role` | user ID, allowed role, active flag | `assign_staff_role` (admin-only) |
| `update_store_settings` | settings | `admin_update_store_settings` |
| `retry_notification` | outbox ID | `admin_retry_notification` |

### Delivery sequence

1. Staff verifies shop quote; customer approves; order reaches `confirmed`.
2. Staff calls `assign_delivery` with delivery person name and phone. Assignment is allowed only in `confirmed` or `preparing`.
3. The existing `transition` action moves `preparing` to `out_for_delivery`; database rejects dispatch without a current assignment. The trigger moves the active delivery record to `in_transit`.
4. `delivered` completes that delivery record in the same transaction. Cancellation/rejection/expiry marks any active assignment cancelled. Reassignment preserves the previous record as `reassigned`.
5. COD collection is recorded with `record_cod` under the existing amount checks.

## Staff reads

The dashboard currently selects from `orders`, `order_items`, `products` with inventory relation, `categories`, `shops`, `delivery_areas`, `store_settings`, and staff-visible notification logs/outbox. RLS scopes results by roles. The new `delivery_records` table is staff-readable only. The current dashboard does not yet expose a delivery person assignment form; the operation is available at the backend contract and can be connected in a dashboard follow-up.

## Notifications

`notification-worker` is internal and uses server credentials plus `AMAR_BAZAR_WORKER_SECRET`; `whatsapp-webhook` validates Meta signatures. Neither belongs in client code. Existing worker and webhook are not verified against Meta in a live environment.

## Error behavior

Edge Functions return structured `{ error: { code, message, requestId, retryable } }`. Database authorization (`42501`) maps to 403; invalid input (`22023`) to 400; stale/invalid state, stock and idempotency conflicts map to non-retryable conflict responses; unknown failures return a generic retryable response. Do not surface raw SQL, provider payloads or secrets to customers.

## CORS and URL

Current shared CORS allows `*`; tighten allowed origins before exposing staff operations and any browser customer function in production. Configure client-facing URLs per environment and use HTTPS outside local development. Never put a service-role key in `apikey` or a client bundle.
