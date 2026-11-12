const BDT = new Intl.NumberFormat("en-BD", { maximumFractionDigits: 2 });

function clean(value) { return String(value ?? "").trim(); }
function money(value) { return `৳${BDT.format(Number(value))}`; }

export function normalizeBangladeshMobile(raw) {
  const compact = clean(raw).replace(/[\s()-]/g, "");
  if (/^\+?8801[3-9]\d{8}$/.test(compact)) return compact.replace(/^\+/, "");
  if (/^01[3-9]\d{8}$/.test(compact)) return `88${compact}`;
  throw new Error("INVALID_PHONE");
}

export function buildWhatsAppOrderMessage({ customer, cart, products, deliveryArea, reference, createdAt = new Date() }) {
  const name = clean(customer?.name);
  const phone = clean(customer?.phone);
  const address = clean(customer?.address);
  const instructions = clean(customer?.instructions);
  if (!name) throw new Error("NAME_REQUIRED");
  if (!address) throw new Error("ADDRESS_REQUIRED");
  const normalizedPhone = normalizeBangladeshMobile(phone);
  if (!Array.isArray(cart) || cart.length === 0) throw new Error("CART_EMPTY");
  if (!deliveryArea?.name || !Number.isFinite(Number(deliveryArea.fee)) || Number(deliveryArea.fee) < 0) throw new Error("AREA_REQUIRED");

  const lines = cart.map((row) => {
    if (!Number.isInteger(Number(row?.qty)) || Number(row.qty) < 1) throw new Error("INVALID_QUANTITY");
    const product = products.find((item) => String(item.id) === String(row.id));
    if (!product || !Number.isFinite(Number(product.price)) || Number(product.price) < 0) throw new Error("PRODUCT_UNAVAILABLE");
    return { product, qty: Number(row.qty), lineTotal: Number(product.price) * Number(row.qty) };
  });
  const subtotal = lines.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = Number(deliveryArea.fee);
  const vendors = [...new Set(lines.map(({ product }) => clean(product.shop)).filter(Boolean))];
  const date = new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(createdAt);
  const itemText = lines.map(({ product, qty, lineTotal }, index) => [
    `${index + 1}. ${clean(product.name)}`,
    `   Shop: ${clean(product.shop) || "Amar Bazar partner"}`,
    `   Quantity: ${qty} ${clean(product.unit)}`.trim(),
    `   Unit price (estimate): ${money(product.price)}`,
    `   Item total (estimate): ${money(lineTotal)}`,
  ].join("\n")).join("\n\n");

  return [
    "🛒 AMAR BAZAR — NEW ORDER REQUEST",
    "━━━━━━━━━━━━━━━━━━",
    "👤 CUSTOMER INFORMATION",
    `Name: ${name}`,
    `Phone: +${normalizedPhone}`,
    `Address: ${address}`,
    `Delivery area: ${clean(deliveryArea.name)}`,
    `Instructions: ${instructions || "None"}`,
    "━━━━━━━━━━━━━━━━━━",
    "🍔 ORDER DETAILS",
    `Shop(s): ${vendors.join(", ") || "Amar Bazar partner"}`,
    itemText,
    "━━━━━━━━━━━━━━━━━━",
    "💰 ORDER SUMMARY",
    `Subtotal (estimate): ${money(subtotal)}`,
    `Delivery charge (estimate): ${money(deliveryFee)}`,
    `Estimated total: ${money(subtotal + deliveryFee)}`,
    "━━━━━━━━━━━━━━━━━━",
    `Temporary order reference: ${reference}`,
    `Order date: ${date} (Bangladesh time)`,
    "",
    "This is an order request only. Product availability, prices and delivery charge must be confirmed by Amar Bazar before acceptance.",
    "অর্ডারটি পাঠাতে WhatsApp-এ Send চাপুন। Send না করা পর্যন্ত অর্ডারটি আমাদের কাছে পৌঁছায়নি বা নিশ্চিত হয়নি।",
    "Thank you for choosing Amar Bazar!",
    "Your Neighborhood Market, Our Responsibility.",
  ].join("\n");
}

export function buildWhatsAppOrderUrl(rawBusinessNumber, message) {
  const number = clean(rawBusinessNumber).replace(/[\s+()-]/g, "");
  if (!/^8801[3-9]\d{8}$/.test(number)) throw new Error("WHATSAPP_NUMBER_NOT_CONFIGURED");
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  if (url.length > 7500) throw new Error("MESSAGE_TOO_LONG");
  return url;
}

export function createTemporaryOrderReference() {
  const random = globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 8).toUpperCase();
  if (random) return `AB-WA-${random}`;
  return `AB-WA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
