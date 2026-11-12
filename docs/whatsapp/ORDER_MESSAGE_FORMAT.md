# WhatsApp Order Message Format

The message is assembled from the checkout form, selected area and current cart. In connected mode, item prices and delivery fee come from the server-created order snapshot. In preview mode, the site labels all values as estimates.

```text
🛒 AMAR BAZAR — NEW ORDER REQUEST
━━━━━━━━━━━━━━━━━━
👤 CUSTOMER INFORMATION
Name: [Customer Name]
Phone: +[Bangladesh number]
Address: [Delivery Address]
Delivery area: [Selected Area]
Instructions: [Optional Instructions]
━━━━━━━━━━━━━━━━━━
🍔 ORDER DETAILS
Shop(s): [Vendor Names]
1. [Product]
   Shop: [Shop]
   Quantity: [Quantity] [Unit]
   Unit price (estimate): ৳[Price]
   Item total (estimate): ৳[Line Total]
━━━━━━━━━━━━━━━━━━
💰 ORDER SUMMARY
Subtotal (estimate): ৳[Subtotal]
Delivery charge (estimate): ৳[Delivery Fee]
Estimated total: ৳[Estimated Total]
━━━━━━━━━━━━━━━━━━
Temporary order reference: [Reference]
Order date: [Bangladesh date/time]

This is an order request only. Product availability, prices and delivery charge must be confirmed by Amar Bazar before acceptance.
অর্ডারটি পাঠাতে WhatsApp-এ Send চাপুন। Send না করা পর্যন্ত অর্ডারটি আমাদের কাছে পৌঁছায়নি বা নিশ্চিত হয়নি।
Thank you for choosing Amar Bazar!
Your Neighborhood Market, Our Responsibility.
```

The WhatsApp URL encodes the entire message. The message length is limited to a safe URL size; longer messages use a copy-and-paste fallback. The customer phone and delivery details are sent only when the customer opens WhatsApp or, in live mode, submits the authenticated draft to the backend.
