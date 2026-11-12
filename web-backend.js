import { webConfig } from "./web-config.js";

const SESSION_KEY = "amar-bazar-web-session-v1";
const configured = Boolean(webConfig.supabaseUrl && webConfig.supabasePublishableKey);
const base = webConfig.supabaseUrl.replace(/\/$/, "");
let session = readSession();

function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
function saveSession(value) {
  session = value;
  if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent("amar-auth-change", { detail: value }));
}
function requireConfig() { if (!configured) throw new Error("BACKEND_NOT_CONFIGURED"); }
async function refreshSession() {
  if (!session?.refresh_token) return null;
  const response = await fetch(`${base}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST", headers: { apikey: webConfig.supabasePublishableKey, "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { saveSession(null); return null; }
  saveSession(data); return data;
}
async function accessToken() {
  if (!session) return webConfig.supabasePublishableKey;
  if (Number(session.expires_at || 0) < Math.floor(Date.now() / 1000) + 30) await refreshSession();
  return session?.access_token || webConfig.supabasePublishableKey;
}
async function request(path, options = {}) {
  requireConfig();
  const token = await accessToken();
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { apikey: webConfig.supabasePublishableKey, authorization: `Bearer ${token}`, ...(options.body ? { "content-type": "application/json" } : {}), ...options.headers },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.msg || payload?.error_description || payload?.error || `REQUEST_FAILED_${response.status}`);
    error.status = response.status; error.code = payload?.code;
    throw error;
  }
  return payload;
}
function query(table, params) { return `/rest/v1/${table}?${new URLSearchParams(params)}`; }

export const backendConfigured = configured;
export function currentSession() { return session; }
export function normalizedBangladeshPhone(raw) {
  const phone = String(raw || "").replace(/[\s()-]/g, "");
  if (/^\+8801[3-9]\d{8}$/.test(phone)) return phone;
  if (/^8801[3-9]\d{8}$/.test(phone)) return `+${phone}`;
  if (/^01[3-9]\d{8}$/.test(phone)) return `+88${phone}`;
  throw new Error("PHONE_INVALID");
}
export async function requestPhoneCode(phone) {
  requireConfig();
  const response = await fetch(`${base}/auth/v1/otp`, { method: "POST", headers: { apikey: webConfig.supabasePublishableKey, "content-type": "application/json" }, body: JSON.stringify({ phone: normalizedBangladeshPhone(phone), channel: "sms", create_user: true }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || "OTP_REQUEST_FAILED");
}
export async function verifyPhoneCode(phone, token) {
  requireConfig();
  const response = await fetch(`${base}/auth/v1/verify`, { method: "POST", headers: { apikey: webConfig.supabasePublishableKey, "content-type": "application/json" }, body: JSON.stringify({ phone: normalizedBangladeshPhone(phone), token: String(token).trim(), type: "sms" }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || "OTP_INVALID");
  saveSession(data); return data;
}
export function signOut() { saveSession(null); }

export async function loadCatalog() {
  const [productRows, categoryRows, shopRows, areaRows, settingsRows] = await Promise.all([
    request(query("products", { select: "id,shop_id,category_id,name,description,image_path,unit_label,price,currency,is_active,is_available,category:categories!inner(id,name,slug),shop:shops!inner(id,name,slug,is_active)", is_active: "eq.true", is_available: "eq.true", "shop.is_active": "eq.true", "category.is_active": "eq.true", order: "name.asc", limit: "400" })),
    request(query("categories", { select: "id,name,slug,sort_order", is_active: "eq.true", order: "sort_order.asc,name.asc" })),
    request(query("shops", { select: "id,name,slug", is_active: "eq.true", order: "name.asc" })),
    request(query("delivery_areas", { select: "id,name,slug,fee,effective_from,effective_until", is_active: "eq.true", order: "sort_order.asc,name.asc" })),
    request(query("store_settings", { select: "display_name,orders_enabled,cod_enabled,support_phone,support_whatsapp_url", id: "eq.true", limit: "1" })),
  ]);
  const now = Date.now();
  return {
    products: productRows.map((p) => ({ id: p.id, name: p.name, shop: p.shop.name, category: p.category.slug, categoryName: p.category.name, price: Number(p.price), unit: p.unit_label, kind: "food", symbol: p.category.slug, restaurant: p.category.slug === "restaurants", menuCategory: p.category.name, image: p.image_path ? `${base}/storage/v1/object/public/product-media/${p.image_path}` : null, description: p.description || "Availability and current price are confirmed by the shop.", priceNote: "Current shop listing · subject to server verification" })),
    categories: categoryRows.map((c) => ({ id: c.slug, name: c.name, icon: "◉", backendId: c.id })),
    shops: shopRows,
    deliveryAreas: areaRows.filter((a) => (!a.effective_from || Date.parse(a.effective_from) <= now) && (!a.effective_until || Date.parse(a.effective_until) > now)).map((a) => ({ id: a.id, name: a.name, fee: Number(a.fee) })),
    settings: settingsRows[0] || null,
  };
}

export async function createOrder({ name, phone, areaId, address, landmark, note, coordinates, items, idempotencyKey }) {
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  return request("/functions/v1/create-order", { method: "POST", headers: { "idempotency-key": idempotencyKey }, body: JSON.stringify({ areaId, recipientName: name, phone: normalizedBangladeshPhone(phone), addressLine: address, landmark: landmark || null, customerNote: note || null, coordinates: coordinates ? { latitude: coordinates.lat, longitude: coordinates.lng } : null, items: items.map((item) => ({ productId: item.id, quantity: item.qty })) }) });
}
export async function createWhatsAppOrderDraft({ name, phone, areaId, address, landmark, note, coordinates, items, idempotencyKey }) {
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  return request("/functions/v1/create-whatsapp-order-draft", { method: "POST", headers: { "idempotency-key": idempotencyKey }, body: JSON.stringify({ areaId, recipientName: name, phone: normalizedBangladeshPhone(phone), addressLine: address, landmark: landmark || null, customerNote: note || null, coordinates: coordinates ? { latitude: coordinates.lat, longitude: coordinates.lng } : null, items: items.map((item) => ({ productId: item.id, quantity: item.qty })) }) });
}
export async function listMyOrders() {
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  return request(query("orders", { select: "id,public_code,status,customer_decision,area_name_snapshot,recipient_name_snapshot,phone_snapshot,address_snapshot,final_total,estimated_total,quote_version,created_at,completed_at", order: "created_at.desc", limit: "100" }));
}
export async function getMyProfile() {
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  const userResponse = await request("/auth/v1/user");
  const rows = await request(query("profiles", { select: "id,display_name,phone_e164", id: `eq.${userResponse.id}`, limit: "1" }));
  return rows[0] || { id: userResponse.id, display_name: "", phone_e164: userResponse.phone || "" };
}
export async function updateMyProfile(displayName) {
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  const user = await request("/auth/v1/user");
  return request(query("profiles", { id: `eq.${user.id}` }), { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ display_name: String(displayName).trim().slice(0, 100) }) });
}
export async function listMyAddresses() {
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  return request(query("customer_addresses", { select: "id,label,recipient_name,phone_e164,area_id,address_line,landmark,latitude,longitude,is_default,created_at", order: "is_default.desc,created_at.desc" }));
}
export async function saveMyAddress(address) {
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  const user = await request("/auth/v1/user");
  return request("/rest/v1/customer_addresses", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ customer_id: user.id, label: String(address.label || "Home").trim().slice(0, 50), recipient_name: String(address.name).trim().slice(0, 100), phone_e164: normalizedBangladeshPhone(address.phone), area_id: address.areaId, address_line: String(address.line).trim().slice(0, 500), landmark: String(address.landmark || "").trim().slice(0, 200) || null, latitude: address.coordinates?.lat ?? null, longitude: address.coordinates?.lng ?? null, is_default: Boolean(address.isDefault) }) });
}
export async function deleteMyAddress(id) {
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  return request(query("customer_addresses", { id: `eq.${id}` }), { method: "DELETE" });
}
export async function getOrder(id) {
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  const [orders, items, events] = await Promise.all([
    request(query("orders", { select: "id,public_code,status,customer_decision,area_name_snapshot,recipient_name_snapshot,phone_snapshot,address_snapshot,landmark_snapshot,customer_note,estimated_subtotal,estimated_delivery_fee,estimated_total,final_subtotal,final_delivery_fee,final_total,quote_version,estimated_eta,created_at,completed_at", id: `eq.${id}`, limit: "1" })),
    request(query("order_items", { select: "id,product_id,shop_id,requested_name,requested_unit_label,requested_unit_price,quantity,fulfillment_state,fulfilled_name,final_unit_price", order_id: `eq.${id}`, order: "created_at.asc" })),
    request(query("order_status_history", { select: "from_status,to_status,source,created_at", order_id: `eq.${id}`, order: "created_at.asc" })),
  ]);
  return orders[0] ? { ...orders[0], items, history: events } : null;
}
export async function decideQuote(orderId, quoteVersion, decision) {
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  return request("/functions/v1/customer-order-decision", { method: "POST", body: JSON.stringify({ orderId, quoteVersion, decision }) });
}
export async function cancelOrder(orderId, reason = "") {
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  return request("/functions/v1/customer-cancel-order", { method: "POST", body: JSON.stringify({ orderId, reason: String(reason).slice(0, 300) }) });
}
