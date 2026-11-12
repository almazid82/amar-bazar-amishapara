# Amar Bazar WhatsApp Cloud API Setup

**Provider:** official Meta WhatsApp Cloud API only.  
**Current state:** code path and safe test mode are local; no Meta credentials, approved template, webhook, or live send are configured or verified.

## New-order message flow

1. Authenticated customer submits an order request to `create-order`.
2. The database transaction saves the order/event and enqueues one `recipient_type=admin` WhatsApp outbox row for the `order_received` event. The staff notification is independent of customer notification consent.
3. The server-side `notification-worker` claims the row with a lease. It loads the order and its item snapshot server-side; the admin phone number comes only from the Edge Function secret `ADMIN_WHATSAPP_PHONE`.
4. In live mode, the worker sends the approved Meta template, then stores the provider message ID/result and a redacted attempt record. It never changes the order state.
5. Meta delivery webhooks update message-delivery logs only. They cannot confirm an order or approve a quote.
6. Temporary HTTP 429/5xx errors retry with bounded backoff. Permanent errors become dead-letter entries. An ambiguous network result is marked `unknown` and is not blindly resent. An authorized admin may manually retry eligible `dead_letter` or `skipped` entries; the worker rechecks consent for customer messages.

Customer notification rows remain separate and require active, explicit customer WhatsApp opt-in. Creating an admin alert does not imply customer consent.

## Safe dry-run mode

The worker defaults to dry-run unless `WHATSAPP_DRY_RUN=false` is explicitly set. It still requires local Supabase server credentials to claim/record jobs, but does not call Meta and records `skipped` with `DRY_RUN_NO_MESSAGE_SENT`. This is a visible no-send result, not a fake “sent” status. Meta credentials are not required for dry-run. Admins can retry skipped jobs after live configuration, and the worker still validates current customer opt-in before sending customer messages.

## Meta setup before live messages

Complete these steps in the business's official Meta Business/Developer accounts, not in source code:

1. Create/configure the Meta app and WhatsApp Business Account, verify business/phone ownership, and select the correct WhatsApp phone-number ID.
2. Create an **approved utility template** for an internal new-order operations alert in the required language. Example body with seven positional variables:

   ```text
   New Amar Bazar order {{1}}
   Customer: {{2}} ({{3}})
   Estimated total: {{4}}
   Delivery: {{5}}
   Items: {{6}}
   Payment: {{7}}
   ```

   Configure its exact Meta template name as `admin_new_order`. The sender uses Bengali template language `bn` by default; set `META_TEMPLATE_LANGUAGE` only to the exact approved language code. Confirm the final template is accepted by Meta before enabling sending.
3. Make sure the admin recipient has opted in to receive the business's WhatsApp messages. Use approved templates for business-initiated messages outside the customer-service window. Respect Meta opt-in, template, quality and messaging policies.
4. Store values only as Supabase Edge Function secrets (or local-only function env): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AMAR_BAZAR_WORKER_SECRET`, `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, `META_API_VERSION`, `META_TEMPLATE_LANGUAGE`, `ADMIN_WHATSAPP_PHONE`, `META_WEBHOOK_VERIFY_TOKEN`, and `META_APP_SECRET`.
5. Set `WHATSAPP_DRY_RUN=false` only in a reviewed environment after template and recipient checks. Keep the service-role key, worker secret, Meta token, App Secret and webhook verify token server-only. Never use `VITE_*` or `EXPO_PUBLIC_*` for secrets.
6. Configure the Meta webhook callback at the deployed `whatsapp-webhook` function URL and subscribe to message status events. Verify the callback token and App Secret; the handler validates `X-Hub-Signature-256` against the raw request body.
7. Schedule the protected `notification-worker` invocation. Supply the internal `x-worker-secret` from a trusted scheduler/secret store; never place it in the browser or Android app. The function is intentionally not callable with a customer/staff JWT alone.

## Message data and privacy

The admin message contains exactly the requested operational fields: order reference, recipient name, customer phone, current estimated/final total, delivery address and area, ordered product names/quantities/units, and Cash on Delivery. The phone and address are sensitive operational data: send only to the owner-approved admin recipient and restrict who can view outbox/logs. Logs store provider identifiers/error codes rather than full message payloads. Keep the alert template concise; the worker truncates address and item summaries to fit operational message limits.

## Manual retry and recovery

- `dead_letter`: inspect template/recipient/provider error, fix server configuration, then use admin-only retry.
- `skipped / NO_CURRENT_OPT_IN`: customer message remains unsent until the customer opts in. Retrying without consent will safely skip again.
- `skipped / DRY_RUN_NO_MESSAGE_SENT`: no request was made to Meta. Turn dry-run off only after owner review and retry from the dashboard.
- `unknown`: do not blindly resend. Check Meta's webhook/status view for the provider message ID or reconcile first to avoid duplicate alerts.
- Every outcome leaves the committed order unchanged. Staff still has phone fallback through the customer phone field in the dashboard.

No external Meta account was accessed, no credential was invented, no message was sent, and no webhook or scheduler was configured in this implementation phase.
