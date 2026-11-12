import { corsHeaders, errorResponse, isPhoneE164, isUuid, json, mapDatabaseError, parseJson, readBearer } from "../_shared/http.ts";
import { getUserClient } from "../_shared/userClient.ts";

type Item = { productId: string; quantity: number };
const uuidHeader = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (request.method !== "POST") return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST.");
  if (!readBearer(request)) return errorResponse(401, "AUTH_REQUIRED", "Sign in before creating an order draft.");
  const body = await parseJson(request);
  if (!body) return errorResponse(400, "INVALID_INPUT", "The request body must be valid JSON under 64 KB.");
  const key = request.headers.get("idempotency-key");
  const items = body.items;
  if (!key || !uuidHeader.test(key) || !isUuid(body.areaId) || !Array.isArray(items) || items.length < 1 || items.length > 30) {
    return errorResponse(400, "INVALID_INPUT", "Provide an idempotency key, delivery area, and 1–30 items.");
  }
  const normalized: Item[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    if (!raw || typeof raw !== "object") return errorResponse(400, "INVALID_INPUT", "Each item needs a product ID and quantity.");
    const item = raw as Record<string, unknown>;
    if (!isUuid(item.productId) || !Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 99 || seen.has(item.productId)) {
      return errorResponse(400, "INVALID_INPUT", "Items need unique product IDs and quantities from 1 to 99.");
    }
    seen.add(item.productId);
    normalized.push({ productId: item.productId, quantity: Number(item.quantity) });
  }
  const addressId = body.addressId == null ? null : body.addressId;
  if (addressId !== null && !isUuid(addressId)) return errorResponse(400, "INVALID_INPUT", "The saved address ID is invalid.");
  if (addressId === null && (typeof body.recipientName !== "string" || body.recipientName.trim().length < 1 || body.recipientName.length > 100 ||
    !isPhoneE164(body.phone) || typeof body.addressLine !== "string" || body.addressLine.trim().length < 1 || body.addressLine.length > 500)) {
    return errorResponse(400, "INVALID_INPUT", "Provide a recipient, E.164 phone number, and delivery address.");
  }
  const coords = body.coordinates;
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (coords != null) {
    if (typeof coords !== "object" || Array.isArray(coords)) return errorResponse(400, "INVALID_INPUT", "Coordinates must include latitude and longitude.");
    const point = coords as Record<string, unknown>;
    if (typeof point.latitude !== "number" || typeof point.longitude !== "number" || point.latitude < -90 || point.latitude > 90 || point.longitude < -180 || point.longitude > 180) {
      return errorResponse(400, "INVALID_INPUT", "Coordinates are out of range.");
    }
    latitude = point.latitude; longitude = point.longitude;
  }
  if (typeof body.customerNote === "string" && body.customerNote.length > 1000) return errorResponse(400, "INVALID_INPUT", "The note is too long.");
  const authenticated = await getUserClient(request);
  if (!authenticated) return errorResponse(401, "AUTH_REQUIRED", "Your session expired. Sign in and retry with the same idempotency key.");
  const { data, error } = await authenticated.client.rpc("create_whatsapp_order_draft", {
    p_idempotency_key: key, p_area_id: body.areaId, p_address_id: addressId,
    p_recipient_name: typeof body.recipientName === "string" ? body.recipientName.trim() : null,
    p_phone_e164: typeof body.phone === "string" ? body.phone.trim() : null,
    p_address_line: typeof body.addressLine === "string" ? body.addressLine.trim() : null,
    p_landmark: typeof body.landmark === "string" ? body.landmark.trim().slice(0, 200) : null,
    p_customer_note: typeof body.customerNote === "string" ? body.customerNote.trim() : null,
    p_latitude: latitude, p_longitude: longitude,
    p_items: normalized.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
  });
  if (error) return mapDatabaseError(error);
  return json(data?.replayed ? 200 : 201, data);
});
