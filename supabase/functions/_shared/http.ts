export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, idempotency-key, x-worker-secret, x-hub-signature-256",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(status: number, body: unknown, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function requestId() {
  return crypto.randomUUID();
}

export function errorResponse(status: number, code: string, message: string, retryable = false) {
  return json(status, { error: { code, message, requestId: requestId(), retryable } });
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isPhoneE164(value: unknown): value is string {
  return typeof value === "string" && /^\+[1-9]\d{7,14}$/.test(value);
}

export function readBearer(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return /^Bearer\s+\S+$/i.test(value) ? value : null;
}

export async function parseJson(request: Request, maxBytes = 64_000): Promise<Record<string, unknown> | null> {
  const contentType = request.headers.get("content-type") ?? "";
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!contentType.toLowerCase().includes("application/json") || declared > maxBytes) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function mapDatabaseError(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  const known: Record<string, [number, string, string, boolean]> = {
    AUTH_REQUIRED: [401, "AUTH_REQUIRED", "Sign in to continue.", false],
    FORBIDDEN: [403, "FORBIDDEN", "You do not have permission to do that.", false],
    AREA_UNAVAILABLE: [422, "AREA_UNAVAILABLE", "This delivery area is not available.", false],
    ITEM_UNAVAILABLE: [409, "ITEM_UNAVAILABLE", "One or more items are unavailable. Refresh the catalog and try again.", false],
    STOCK_CONFLICT: [409, "STOCK_CONFLICT", "Availability changed. Please review the order again.", false],
    IDEMPOTENCY_CONFLICT: [409, "IDEMPOTENCY_CONFLICT", "This request key was already used for a different order.", false],
    QUOTE_STALE: [409, "QUOTE_STALE", "The quote changed. Reload it before deciding.", false],
    INVALID_TRANSITION: [409, "INVALID_TRANSITION", "The order is no longer in that state.", false],
    DELIVERY_ASSIGNMENT_REQUIRED: [409, "DELIVERY_ASSIGNMENT_REQUIRED", "Assign a delivery person before dispatching this order.", false],
    ORDER_NOT_FOUND: [404, "ORDER_NOT_FOUND", "The requested order could not be found.", false],
    ORDERS_DISABLED: [503, "ORDERS_DISABLED", "Order requests are temporarily unavailable.", true],
    ADDRESS_INVALID: [400, "INVALID_INPUT", "Choose a valid saved address for this area.", false],
  };
  const match = Object.entries(known).find(([key]) => message.includes(key));
  if (match) {
    const [status, code, safeMessage, retryable] = match[1];
    return errorResponse(status, code, safeMessage, retryable);
  }
  if (error.code === "42501") return errorResponse(403, "FORBIDDEN", "You do not have permission to do that.");
  if (error.code === "22023") return errorResponse(400, "INVALID_INPUT", "Check the submitted details and try again.");
  return errorResponse(500, "TEMPORARY_FAILURE", "We could not complete that request. Please try again.", true);
}
