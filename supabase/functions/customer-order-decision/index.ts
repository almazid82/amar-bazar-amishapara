import { corsHeaders, errorResponse, isUuid, json, mapDatabaseError, parseJson, readBearer } from "../_shared/http.ts";
import { getUserClient } from "../_shared/userClient.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (request.method !== "POST") return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST.");
  if (!readBearer(request)) return errorResponse(401, "AUTH_REQUIRED", "Sign in before deciding on a quote.");
  const body = await parseJson(request, 8_000);
  if (!body || !isUuid(body.orderId) || !Number.isInteger(body.quoteVersion) || Number(body.quoteVersion) < 1 ||
    !["approved", "changes_requested", "rejected"].includes(String(body.decision))) {
    return errorResponse(400, "INVALID_INPUT", "Provide an order ID, quote version and decision.");
  }
  const authenticated = await getUserClient(request);
  if (!authenticated) return errorResponse(401, "AUTH_REQUIRED", "Your session expired. Sign in again.");
  const { data, error } = await authenticated.client.rpc("decide_order_quote", {
    p_order_id: body.orderId,
    p_quote_version: Number(body.quoteVersion),
    p_decision: body.decision,
  });
  if (error) return mapDatabaseError(error);
  return json(200, data);
});
