# Amar Bazar Notification Design

**Status:** proposed WhatsApp Cloud API integration; no Meta account/service configured.  
Primary channel is official Meta WhatsApp Cloud API for opted-in transactional notifications. In-app order status is authoritative; phone calls remain the operational fallback.

## 1. Notification architecture

1. A database transaction changes the order/quote/decision state, appends its `order_events` row, and inserts a notification job into `app_private.notification_outbox` keyed by `(order_event_id,channel)`. Customer opt-in/revocation is stored in `customer_notification_preferences` through a server-timestamped consent function.
2. A scheduled/triggered Edge Function claims a bounded batch using a safe lock/lease, then loads the protected recipient number and template parameters from authorized order data.
3. The function checks WhatsApp opt-in and the event/template mapping, calls Meta Cloud API using a server-held access token, and stores provider message ID/status.
4. Meta sends delivery/read/failure webhooks to `whatsapp-webhook`. The function validates the raw-body HMAC signature, deduplicates provider events, and updates the notification record.
5. Admin dashboard shows delivery failures for manual phone follow-up. Mobile app also fetches order state and can subscribe to private Realtime updates; it must refetch after reconnect.

## 2. Events and message policy

| Event | Customer message purpose | Notes |
| --- | --- | --- |
| `order_received` | Confirm request was received; explain shop check and that it is not confirmed | Do not promise delivery time before verification |
| `quote_ready` | Tell customer the verified quote is ready; deep-link to review items, substitutions, fee, ETA and approve/decline | Message includes order reference and secure app link, not sensitive address |
| `order_confirmed` | Confirm only after recorded app or phone approval | State the approved total and COD due |
| `order_preparing` | Operational progress update | Optional for pilot; rate-limit duplicate sends |
| `order_out_for_delivery` | Delivery progress message and expected time range | Do not claim GPS/live tracking in v1 |
| `order_delivered` | Completion and support contact | COD collection status remains separate |
| `order_cancelled` | Explain cancellation outcome | Include generic reason only; no sensitive internal notes |

Only send approved Meta message templates where required by platform policy. Template copy, language, category and parameters must be approved/configured in Meta before production. Obtain and record explicit customer WhatsApp opt-in, explain that it is for order updates, and provide an opt-out path. The current shareable WhatsApp link is a manual contact channel, not Cloud API integration or proof of opt-in.

## 3. Quote approval security

WhatsApp “Review quote” links open an HTTPS Android App Link that is verified for the signed app, with a browser fallback. The app requires an authenticated session and fetches the quote through RLS. Customer explicitly approves/rejects the current `quoteVersion` in the app. A message read receipt, webhook, or arbitrary inbound text must never be interpreted as approval.

If the customer cannot use the app, the operator calls and records verbal approval using the protected phone-decision endpoint. This fallback stores actor, quote version, affirmative outcome, and call timestamp. No-answer is not approval.

## 4. Outbox delivery, retries and deduplication

- Insert outbox record in the same transaction as the order event so a committed state change cannot lose its notification request.
- Worker claims jobs with a lease/lock, increments attempts, sets processing; concurrent workers must not send the same pending job simultaneously.
- Retry transient failures with bounded exponential backoff and jitter; permanent invalid recipient/template/opt-out failures go to dead-letter/manual review.
- Unique order-event/channel key prevents duplicate jobs. Provider webhook IDs/message IDs are deduplicated.
- External delivery is at-least-once in failure ambiguity; exactly-once delivery cannot be guaranteed. If a request times out after Meta accepted it but before response, avoid rapid blind resend; mark `unknown`, allow webhook reconciliation, then apply a conservative retry policy.
- Store provider codes and message IDs, not full payloads or customer PII in logs. Keep a redacted audit record for support.
- Notification failures never roll back a committed order and never change approval/payment/order status.

## 5. Webhook security and operations

- GET challenge endpoint verifies the configured Meta webhook token; keep it separate from App Secret and API access token.
- POST handler validates `X-Hub-Signature-256` HMAC with Meta App Secret over the exact raw body using constant-time comparison.
- Reject invalid signatures and malformed/oversized payloads; deduplicate event IDs; acknowledge valid events promptly and process idempotently.
- Webhook updates only outbound delivery/read/failure metadata unless a later reviewed design adds inbound support. It does not set customer approval or COD collection.
- Monitor pending job age, send failures, dead letters, webhook signature failures, and template errors. Provide a manual replay/recovery path restricted to admin.
- Keep WhatsApp API version configurable server-side and review Meta policy/pricing/template changes before release.

## 6. Data model fields

Use `notification_outbox`, `notification_webhook_events`, and `customer_notification_preferences` as defined in `DATABASE_SCHEMA.md`. Never assume a phone number implies consent.

