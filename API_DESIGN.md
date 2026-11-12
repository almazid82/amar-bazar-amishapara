# Amar Bazar API Design

**Status:** proposed API contract; not implemented.  
Clients use the Supabase publishable key and the signed-in user's Auth JWT. Privileged workflow operations are exposed as Edge Functions and backed by transaction-safe PostgreSQL functions. Direct Data API reads are protected by RLS.

## Common conventions

- Base URL is the Supabase project URL; function routes use `/functions/v1/<function-name>`.
- Authenticated calls include `Authorization: Bearer <user JWT>` and `apikey: <publishable key>`. The publishable key is not an authorization substitute.
- JSON uses camelCase at the API boundary; database columns use snake_case.
- Money is decimal string/number in BDT. Server recomputes all totals from database prices/fees; client-sent totals are rejected/ignored.
- Request IDs and order IDs are UUIDs; public order code is non-sequential and not a bearer credential.
- Create-order requires `Idempotency-Key: <UUID>` and persists uniqueness by `(customer_id, idempotency_key)`.
- Stable errors use `{ "error": { "code": "...", "message": "...", "requestId": "...", "retryable": false } }`; never include SQL, secrets, or unnecessary PII.

## Authentication

Use Supabase Auth phone OTP endpoints/SDK on the client. OTP verifies access to the number; the separate shop-check/customer-approval workflow verifies the order itself. Staff accounts are provisioned by invite/owner process and get database role rows from a protected function. Never use user-editable Auth metadata to grant staff access.

## Catalog and reference data

### Public, RLS-protected reads

- `GET /rest/v1/shops?is_active=eq.true`
- `GET /rest/v1/categories?is_active=eq.true&order=sort_order`
- `GET /rest/v1/products?is_active=eq.true&is_available=eq.true` (select only public columns; no exact internal stock quantity)
- `GET /rest/v1/delivery_areas?is_active=eq.true&select=id,name,fee,currency,sort_order`

Filters/search are paginated and bounded. Return only current customer-visible data and media paths. Stale cached catalog is labeled as possibly outdated.

## Customer order endpoints

### `POST /functions/v1/create-order`

Requires customer JWT. Body contains customer-selected IDs and delivery/contact details only:

```json
{
  "areaId": "uuid",
  "addressId": "uuid-or-null",
  "recipientName": "Customer name",
  "phone": "+8801XXXXXXXXX",
  "addressLine": "House and directions",
  "landmark": "Optional nearby point",
  "coordinates": { "latitude": 23.0, "longitude": 91.0 },
  "customerNote": "Optional note",
  "items": [{ "productId": "uuid", "quantity": 2 }]
}
```

The client does not submit trusted unit price, delivery fee, or total. Function forwards authenticated identity to `create_order` transaction function. It returns `201` for newly created order or `200` for the same idempotent order:

```json
{
  "orderId": "uuid",
  "publicCode": "AB-...",
  "status": "pending_verification",
  "estimatedSubtotal": "250.00",
  "estimatedDeliveryFee": "60.00",
  "estimatedTotal": "310.00",
  "quoteVersion": 0,
  "createdAt": "ISO-8601"
}
```

### `GET /rest/v1/orders?id=eq.<orderId>`

Authenticated; RLS returns only the caller's row. Customer item/status detail is read from sanitized `security_invoker` views that check parent-order ownership. Do not expose direct `order_item_checks`, contact attempts, internal staff notes, operator identities, or shop phone numbers in customer-facing views.

### `POST /functions/v1/customer-order-decision`

Requires JWT matching `orders.customer_id` and `status=awaiting_customer_approval`.

```json
{ "orderId": "uuid", "quoteVersion": 2, "decision": "approved" }
```

Allowed decisions: `approved`, `changes_requested`, `rejected`. Version mismatch returns `409 QUOTE_STALE`. Decision, status transition, stock reservation/release, status event, COD setup where appropriate, and notification enqueue commit atomically.

### `POST /functions/v1/cancel-order`

Customer may cancel only in explicitly allowed pre-fulfillment states; function checks owner and state. After confirmation, policy may require staff. An idempotent repeated cancellation returns current state.

## Admin endpoints

Every route requires an authenticated staff JWT plus a server/database role check. UI-only route guards are not sufficient.

| Function | Purpose |
| --- | --- |
| `GET /rest/v1/orders?status=in.(...)` | RLS-limited operator queue, paginated; avoid broad customer exports |
| `POST /functions/v1/verify-order` | Save per-line availability, verified prices, substitutions, final delivery fee and ETA; transitions to `awaiting_customer_approval`, increments quote version |
| `POST /functions/v1/record-phone-decision` | Invokes `record_phone_outcome`: append a phone attempt (including no-answer/callback) and, only for an explicit customer response, record approval/change/rejection; requires operator role and quote version |
| `POST /functions/v1/transition-order` | Allowed staff status transitions, including preparing/out-for-delivery/delivered/cancelled |
| `POST /functions/v1/record-cod-collection` | Record cash collection, amount, time, and staff actor |
| `POST /functions/v1/catalog-upsert` | Create/update/deactivate shop/category/product and price history; catalog-manager/admin only |
| `POST /functions/v1/inventory-adjust` | Adjust tracked quantity with reason and stock ledger; catalog-manager/admin only |
| `POST /functions/v1/delivery-area-upsert` | Change fee/coverage with effective date and actor history; admin only |
| `POST /functions/v1/staff-role-change` | Owner/admin controlled invite/role assignment/revocation; never client metadata |
| `POST /functions/v1/notification-consent` | Record or revoke explicit WhatsApp order-update consent for the authenticated customer; server timestamps the change |

Example `verify-order` body:

```json
{
  "orderId": "uuid",
  "expectedQuoteVersion": 0,
  "items": [
    { "orderItemId": "uuid", "result": "available", "verifiedUnitPrice": "82.00" },
    { "orderItemId": "uuid", "result": "substituted", "alternativeProductId": "uuid", "verifiedUnitPrice": "115.00" }
  ],
  "finalDeliveryFee": "60.00",
  "estimatedEta": "45–60 minutes"
}
```

## WhatsApp endpoints

- `POST /functions/v1/whatsapp-send-worker`: internal/scheduled worker only; claims pending outbox rows, sends approved templates via Meta Cloud API, records provider message ID and attempt status. Not callable by customer/admin UI.
- `GET /functions/v1/whatsapp-webhook`: Meta webhook challenge verification; compare configured verify token securely.
- `POST /functions/v1/whatsapp-webhook`: this public Meta callback has Supabase JWT verification disabled because Meta cannot send the user JWT; the handler must verify `X-Hub-Signature-256` against the exact raw body using App Secret, deduplicate provider event, then update delivery/read/failure status. Reject invalid signatures. Do not accept order state or customer approval solely from an untrusted webhook field.

## Validation and error codes

| Code | HTTP | Meaning / client behavior |
| --- | ---: | --- |
| `AUTH_REQUIRED` | 401 | Reauthenticate; do not retry with a new order key automatically |
| `FORBIDDEN` | 403 | Caller lacks order ownership or staff role |
| `INVALID_INPUT` | 400 | Correct form/quantity/phone/coordinate values |
| `AREA_UNAVAILABLE` | 422 | Choose an active service area |
| `ITEM_UNAVAILABLE` | 409 | Refresh cart/catalog and confirm replacements |
| `STOCK_CONFLICT` | 409 | Approval reservation failed; operator must re-check/re-quote |
| `QUOTE_STALE` | 409 | Reload quote before customer decision |
| `INVALID_TRANSITION` | 409 | Refetch current order; do not force client state |
| `IDEMPOTENCY_CONFLICT` | 409 | Same key with different request payload; create a new intentional request only after user review |
| `RATE_LIMITED` | 429 | Wait and retry with same idempotency key |
| `TEMPORARY_FAILURE` | 503 | Retry with bounded backoff and same idempotency key |

## Realtime contract

Subscribe only to the authenticated user's own order rows and associated event rows via RLS/private channel policy. Staff subscriptions are role-checked and filtered to operational work. Treat events as a signal to refetch; missed or duplicate events must not change state locally. The database status is authoritative.

