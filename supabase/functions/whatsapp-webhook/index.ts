import { errorResponse, json } from "../_shared/http.ts";
import { getServiceClient } from "../_shared/serviceClient.ts";

function fromHex(value: string): Uint8Array | null {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function validSignature(raw: Uint8Array, header: string | null, secret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const signature = fromHex(header.slice(7));
  if (!signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", key, signature, raw);
}

Deno.serve(async (request) => {
  const url = new URL(request.url);
  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const supplied = url.searchParams.get("hub.verify_token") ?? "";
    const expected = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") ?? "";
    if (mode === "subscribe" && expected.length > 0 && supplied === expected) {
      return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return errorResponse(403, "WEBHOOK_VERIFICATION_FAILED", "Webhook verification failed.");
  }
  if (request.method !== "POST") return errorResponse(405, "METHOD_NOT_ALLOWED", "Unsupported webhook method.");
  const appSecret = Deno.env.get("META_APP_SECRET");
  if (!appSecret) return errorResponse(503, "WEBHOOK_NOT_CONFIGURED", "Webhook signature verification is not configured.", true);
  const declaredSize = Number(request.headers.get("content-length") ?? "0");
  if (declaredSize > 1_000_000) return errorResponse(413, "PAYLOAD_TOO_LARGE", "Webhook payload is too large.");
  const raw = new Uint8Array(await request.arrayBuffer());
  if (raw.byteLength > 1_000_000 || !await validSignature(raw, request.headers.get("x-hub-signature-256"), appSecret)) {
    return errorResponse(401, "INVALID_SIGNATURE", "Webhook signature is invalid.");
  }
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(new TextDecoder().decode(raw)) as Record<string, unknown>;
  } catch {
    return errorResponse(400, "INVALID_INPUT", "Webhook payload is invalid JSON.");
  }
  const service = getServiceClient();
  let recorded = 0;
  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const changes = Array.isArray((entry as Record<string, unknown>).changes) ? (entry as Record<string, unknown>).changes as unknown[] : [];
    for (const change of changes) {
      if (!change || typeof change !== "object") continue;
      const value = (change as Record<string, unknown>).value;
      if (!value || typeof value !== "object") continue;
      const statuses = Array.isArray((value as Record<string, unknown>).statuses) ? (value as Record<string, unknown>).statuses as unknown[] : [];
      for (const status of statuses) {
        if (!status || typeof status !== "object") continue;
        const item = status as Record<string, unknown>;
        const messageId = typeof item.id === "string" ? item.id : null;
        const state = typeof item.status === "string" ? item.status : "";
        const timestamp = typeof item.timestamp === "string" ? item.timestamp : "unknown";
        if (!messageId || !["delivered", "read", "failed"].includes(state)) continue;
        const errors = Array.isArray(item.errors) ? item.errors : [];
        const firstError = errors[0] && typeof errors[0] === "object" ? errors[0] as Record<string, unknown> : null;
        const errorCode = firstError?.code == null ? null : String(firstError.code).slice(0, 100);
        const eventKey = `${messageId}:${state}:${timestamp}`.slice(0, 200);
        const { data, error } = await service.rpc("record_notification_webhook", {
          p_event_key: eventKey, p_message_id: messageId, p_event_type: state, p_error_code: errorCode,
        });
        if (error) return errorResponse(503, "WEBHOOK_PROCESSING_FAILED", "Webhook status could not be recorded.", true);
        if (data) recorded++;
      }
    }
  }
  return json(200, { received: true, recorded });
});
