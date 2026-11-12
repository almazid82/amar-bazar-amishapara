# Order Status Reference

| Stored status | Customer wording | Meaning | Customer action |
|---|---|---|---|
| `pending_submission` | Waiting for WhatsApp send | A server-validated draft exists, but the customer has not yet confirmed sending the WhatsApp message. | Send the prepared message, or cancel the draft. |
| `pending_verification` | Waiting for shop verification | Team is checking stock, substitutions and current prices. | May cancel the request. |
| `awaiting_customer_approval` | Your approval needed | A versioned shop-checked quote is ready. | Approve, request changes, reject, or cancel. |
| `confirmed` | Confirmed | Customer approved; tracked stock is reserved and COD is recorded as due. | Contact support for a cancellation request. |
| `preparing` | Being prepared | Staff is collecting/packing the approved products. | Contact support. |
| `out_for_delivery` | Out for delivery | A staff-assigned rider is carrying the order. | Receive the order and pay COD. |
| `delivered` | Delivered | Delivery was marked complete by staff after handoff. | Contact support for a recorded issue. |
| `cancelled` | Cancelled | The customer or authorized staff cancelled before completion. | No further action. |
| `rejected` | Declined | An authorized staff decision rejected the request/quote. | Contact support if clarification is needed. |
| `expired` | Expired | Staff closed a request that could not be completed in time. | Submit a new request if desired. |

Customer wording is UI text only; the stored status and audited status history are authoritative. A terminal state is not inferred from a local/browser record.
