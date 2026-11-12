import { corsHeaders, errorResponse, isPhoneE164, isUuid, json, mapDatabaseError, parseJson, readBearer } from "../_shared/http.ts";
import { getUserClient } from "../_shared/userClient.ts";

function validMoney(value: unknown) {
  return (typeof value === "number" || typeof value === "string") && /^\d{1,10}(\.\d{1,2})?$/.test(String(value));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (request.method !== "POST") return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST.");
  if (!readBearer(request)) return errorResponse(401, "AUTH_REQUIRED", "Sign in before using an operations action.");
  const body = await parseJson(request);
  if (!body || typeof body.action !== "string") return errorResponse(400, "INVALID_INPUT", "Choose a supported operations action.");
  const auth = await getUserClient(request);
  if (!auth) return errorResponse(401, "AUTH_REQUIRED", "Your session expired. Sign in again.");
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await auth.client.rpc(name, args);
    if (error) return mapDatabaseError(error);
    return json(200, data);
  };
  const orderId = body.orderId;
  switch (body.action) {
    case "verify_quote": {
      if (!isUuid(orderId) || !Number.isInteger(body.expectedQuoteVersion) || !Array.isArray(body.items) || body.items.length > 100 || !validMoney(body.deliveryFee)) {
        return errorResponse(400, "INVALID_INPUT", "Quote verification needs an order, quote version, item checks, and delivery fee.");
      }
      const lines = [];
      for (const raw of body.items) {
        if (!raw || typeof raw !== "object") return errorResponse(400, "INVALID_INPUT", "Each quote line must be an object.");
        const line = raw as Record<string, unknown>;
        if (!isUuid(line.orderItemId) || !["available", "unavailable", "substituted"].includes(String(line.result)) ||
          (line.result !== "unavailable" && !validMoney(line.verifiedUnitPrice)) ||
          (line.alternativeProductId != null && !isUuid(line.alternativeProductId)) ||
          (line.alternativeName != null && (typeof line.alternativeName !== "string" || line.alternativeName.length > 160)) ||
          (line.note != null && (typeof line.note !== "string" || line.note.length > 500))) {
          return errorResponse(400, "INVALID_INPUT", "A quote line contains invalid verification details.");
        }
        lines.push({ order_item_id: line.orderItemId, result: line.result, verified_unit_price: line.verifiedUnitPrice ?? null,
          alternative_product_id: line.alternativeProductId ?? null, alternative_name: line.alternativeName ?? null, note: line.note ?? null });
      }
      return rpc("save_order_quote", { p_order_id: orderId, p_expected_quote_version: body.expectedQuoteVersion,
        p_lines: lines, p_delivery_fee: body.deliveryFee, p_eta: typeof body.estimatedEta === "string" ? body.estimatedEta.slice(0, 100) : null });
    }
    case "phone_outcome":
      if (!isUuid(orderId) || !Number.isInteger(body.quoteVersion) || typeof body.outcome !== "string" || typeof body.note !== "string") return errorResponse(400, "INVALID_INPUT", "Provide the order, quote version, call outcome and call note.");
      return rpc("record_phone_outcome", { p_order_id: orderId, p_quote_version: body.quoteVersion, p_outcome: body.outcome, p_note: body.note });
    case "transition":
      if (!isUuid(orderId) || typeof body.nextStatus !== "string") return errorResponse(400, "INVALID_INPUT", "Provide the order and next status.");
      return rpc("transition_order", { p_order_id: orderId, p_next: body.nextStatus, p_reason: typeof body.reason === "string" ? body.reason : null });
    case "record_cod":
      if (!isUuid(orderId) || !validMoney(body.amount)) return errorResponse(400, "INVALID_INPUT", "Provide the order and collected amount.");
      return rpc("record_cod_collection", { p_order_id: orderId, p_amount: body.amount, p_note: typeof body.note === "string" ? body.note : null });
    case "assign_delivery":
      if (!isUuid(orderId) || typeof body.driverName !== "string" || body.driverName.trim().length < 1 || body.driverName.length > 100 ||
        !isPhoneE164(body.driverPhone) || (body.notes != null && (typeof body.notes !== "string" || body.notes.length > 500))) {
        return errorResponse(400, "INVALID_INPUT", "Provide the order, delivery person name and a valid phone number.");
      }
      return rpc("assign_order_delivery", { p_order_id: orderId, p_driver_name: body.driverName.trim(),
        p_driver_phone_e164: body.driverPhone, p_notes: typeof body.notes === "string" ? body.notes : null });
    case "upsert_shop":
      if (body.id != null && !isUuid(body.id)) return errorResponse(400, "INVALID_INPUT", "Invalid shop ID.");
      return rpc("admin_upsert_shop", { p_id: body.id ?? null, p_name: body.name, p_slug: body.slug, p_description: body.description ?? null,
        p_image_path: body.imagePath ?? null, p_phone: body.phone ?? null, p_active: body.isActive === true });
    case "upsert_category":
      if ((body.id != null && !isUuid(body.id)) || (body.parentId != null && !isUuid(body.parentId))) return errorResponse(400, "INVALID_INPUT", "Invalid category ID.");
      return rpc("admin_upsert_category", { p_id: body.id ?? null, p_parent_id: body.parentId ?? null, p_name: body.name, p_slug: body.slug,
        p_sort_order: Number.isInteger(body.sortOrder) ? body.sortOrder : 0, p_active: body.isActive !== false });
    case "upsert_product":
      if ((body.id != null && !isUuid(body.id)) || !isUuid(body.shopId) || !isUuid(body.categoryId) || !validMoney(body.price)) return errorResponse(400, "INVALID_INPUT", "Invalid product ID, shop, category or price.");
      return rpc("admin_upsert_product", { p_id: body.id ?? null, p_shop_id: body.shopId, p_category_id: body.categoryId, p_sku: body.sku ?? null,
        p_name: body.name, p_description: body.description ?? null, p_image_path: body.imagePath ?? null, p_unit_label: body.unitLabel,
        p_price: body.price, p_active: body.isActive === true, p_available: body.isAvailable === true, p_track_stock: body.trackStock === true });
    case "upsert_delivery_area":
      if ((body.id != null && !isUuid(body.id)) || !validMoney(body.fee)) return errorResponse(400, "INVALID_INPUT", "Invalid service area ID or fee.");
      return rpc("admin_upsert_delivery_area", { p_id: body.id ?? null, p_name: body.name, p_slug: body.slug, p_fee: body.fee,
        p_active: body.isActive === true, p_from: body.effectiveFrom ?? null, p_until: body.effectiveUntil ?? null, p_sort: body.sortOrder ?? 0 });
    case "adjust_inventory":
      if (!isUuid(body.productId) || !Number.isInteger(body.quantityDelta) || typeof body.reason !== "string") return errorResponse(400, "INVALID_INPUT", "Invalid inventory adjustment.");
      return rpc("record_inventory_adjustment", { p_product_id: body.productId, p_quantity_delta: body.quantityDelta, p_reason: body.reason });
    case "assign_staff_role":
      if (!isUuid(body.userId) || !["admin", "order_operator", "catalog_manager"].includes(String(body.role))) return errorResponse(400, "INVALID_INPUT", "Invalid staff identity or role.");
      return rpc("assign_staff_role", { p_user_id: body.userId, p_role: body.role, p_active: body.active !== false,
        p_display_name: typeof body.displayName === "string" ? body.displayName : "" });
    case "update_store_settings":
      if (!validMoney(body.codTolerance) || !Number.isInteger(body.maxOrderItems)) return errorResponse(400, "INVALID_INPUT", "Invalid store settings.");
      return rpc("admin_update_store_settings", { p_display_name: body.displayName, p_support_phone: body.supportPhone ?? null,
        p_whatsapp_url: body.whatsappUrl ?? null, p_orders_enabled: body.ordersEnabled === true, p_cod_enabled: body.codEnabled === true,
        p_cod_tolerance: body.codTolerance, p_max_items: body.maxOrderItems });
    case "retry_notification":
      if (!isUuid(body.outboxId)) return errorResponse(400, "INVALID_INPUT", "Invalid notification reference.");
      return rpc("admin_retry_notification", { p_outbox_id: body.outboxId });
    default:
      return errorResponse(400, "INVALID_INPUT", "Unsupported operations action.");
  }
});
