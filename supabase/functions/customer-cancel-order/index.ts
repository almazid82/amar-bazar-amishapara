import { errorResponse, isUuid, json, mapDatabaseError, parseJson, readBearer } from "../_shared/http.ts";
import { getUserClient } from "../_shared/userClient.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (request.method !== "POST") return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST.");
  if (!readBearer(request)) return errorResponse(401, "AUTH_REQUIRED", "Sign in to cancel an order.");
  const body = await parseJson(request, 4_000);
  if (!body || !isUuid(body.orderId) || (body.reason != null && (typeof body.reason !== "string" || body.reason.length > 300))) {
    return errorResponse(400, "INVALID_INPUT", "Provide a valid order ID and optional short reason.");
  }
  const authenticated = await getUserClient(request);
  if (!authenticated) return errorResponse(401, "AUTH_REQUIRED", "Your session expired. Sign in again.");
  const { data, error } = await authenticated.client.rpc("customer_cancel_order", {
    p_order_id: body.orderId,
    p_reason: typeof body.reason === "string" ? body.reason.trim() : null,
  });
  if (error) return mapDatabaseError(error);
  return json(200, data);
});
