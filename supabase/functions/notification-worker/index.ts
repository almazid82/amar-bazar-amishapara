import { createClient } from "npm:@supabase/supabase-js@2";
import { errorResponse, json } from "../_shared/http.ts";

function constantTimeEqual(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST.");
  const expectedSecret = Deno.env.get("AMAR_BAZAR_WORKER_SECRET");
  const suppliedSecret = request.headers.get("x-worker-secret") ?? "";
  if (!expectedSecret || !constantTimeEqual(expectedSecret, suppliedSecret)) return errorResponse(401, "AUTH_REQUIRED", "Worker authentication failed.");

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = Deno.env.get("META_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("META_PHONE_NUMBER_ID");
  const adminPhone = Deno.env.get("ADMIN_WHATSAPP_PHONE");
  const graphVersion = Deno.env.get("META_API_VERSION");
  const language = Deno.env.get("META_TEMPLATE_LANGUAGE") ?? "bn";
  const dryRun = Deno.env.get("WHATSAPP_DRY_RUN") !== "false";
  if (!url || !serviceKey) {
    return errorResponse(503, "NOTIFICATION_NOT_CONFIGURED", "Notification settings are not configured.", true);
  }

  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const workerId = crypto.randomUUID();
  const { data: jobs, error: claimError } = await service.rpc("claim_notification_jobs", { p_worker: workerId, p_limit: 10 });
  if (claimError) return errorResponse(503, "WORKER_TEMPORARY_FAILURE", "Notification jobs could not be claimed.", true);
  let sent = 0; let skipped = 0; let failed = 0;

  if (dryRun) {
    for (const job of (jobs ?? []) as Array<Record<string, unknown>>) {
      const { error } = await service.rpc("complete_notification_job", {
        p_outbox_id: String(job.id), p_worker: workerId, p_outcome: "skipped", p_error_code: "DRY_RUN_NO_MESSAGE_SENT",
      });
      if (error) failed++; else skipped++;
    }
    return json(200, { claimed: jobs?.length ?? 0, sent, skipped, failed, mode: "dry_run_no_message_sent" });
  }

  if (!token || !phoneNumberId || !graphVersion || !/^v\d+\.\d+$/.test(graphVersion)) {
    return errorResponse(503, "NOTIFICATION_NOT_CONFIGURED", "Meta WhatsApp settings are not configured.", true);
  }

  for (const job of (jobs ?? []) as Array<Record<string, unknown>>) {
    const jobId = String(job.id);
    const attempt = Number(job.attempt_count);
    try {
      const orderId = String(job.order_id);
      const [{ data: order }, { data: orderRecord }] = await Promise.all([
        service.from("orders").select("id,customer_id,public_code,phone_snapshot,recipient_name_snapshot,address_snapshot,landmark_snapshot,area_name_snapshot,estimated_total,final_total").eq("id", orderId).maybeSingle(),
        service.from("notification_outbox").select("id,template_name,recipient_type").eq("id", jobId).maybeSingle(),
      ]);
      if (!order || !orderRecord) {
        await service.rpc("complete_notification_job", { p_outbox_id: jobId, p_worker: workerId, p_outcome: "dead_letter", p_error_code: "ORDER_CONTEXT_MISSING" });
        failed++; continue;
      }
      const isAdminAlert = orderRecord.recipient_type === "admin";
      if (isAdminAlert && (!adminPhone || !/^\+[1-9]\d{7,14}$/.test(adminPhone))) {
        await service.rpc("complete_notification_job", { p_outbox_id: jobId, p_worker: workerId, p_outcome: "dead_letter", p_error_code: "ADMIN_RECIPIENT_NOT_CONFIGURED" });
        failed++; continue;
      }
      const { data: consent } = isAdminAlert ? { data: null } : await service.from("customer_notification_preferences")
        .select("whatsapp_order_updates,consent_at,revoked_at").eq("customer_id", order.customer_id).maybeSingle();
      if (!isAdminAlert && (!consent?.whatsapp_order_updates || !consent.consent_at || consent.revoked_at)) {
        await service.rpc("complete_notification_job", { p_outbox_id: jobId, p_worker: workerId, p_outcome: "skipped", p_error_code: "NO_CURRENT_OPT_IN" });
        skipped++; continue;
      }

      const recipient = isAdminAlert ? adminPhone! : order.phone_snapshot;
      let parameters: Array<{ type: string; text: string }>;
      if (isAdminAlert) {
        const { data: items, error: itemsError } = await service.from("order_items")
          .select("requested_name,requested_unit_label,quantity,requested_unit_price,final_unit_price,fulfillment_state,fulfilled_name")
          .eq("order_id", orderId).order("created_at");
        if (itemsError || !items?.length) throw new Error("ADMIN_ORDER_ITEMS_UNAVAILABLE");
        const itemSummary = items.slice(0, 8).map((item) => {
          const name = item.fulfilled_name || item.requested_name;
          return `${name} × ${item.quantity} ${item.requested_unit_label}`;
        }).join("; ");
        const amount = order.final_total ?? order.estimated_total;
        const address = [order.address_snapshot, order.landmark_snapshot, order.area_name_snapshot].filter(Boolean).join(", ");
        parameters = [order.public_code, order.recipient_name_snapshot, order.phone_snapshot,
          `BDT ${amount}`, address.slice(0, 250), itemSummary.slice(0, 350), "Cash on Delivery"]
          .map((text) => ({ type: "text", text: String(text) }));
      } else {
        parameters = [{ type: "text", text: order.public_code }];
      }

      const metaResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient,
          type: "template",
          template: {
            name: orderRecord.template_name,
            language: { code: language },
            components: [{ type: "body", parameters }],
          },
        }),
      });
      const responseBody = await metaResponse.json().catch(() => ({}));
      const providerMessageId = responseBody?.messages?.[0]?.id;
      if (metaResponse.ok && typeof providerMessageId === "string") {
        const { error } = await service.rpc("complete_notification_job", {
          p_outbox_id: jobId, p_worker: workerId, p_outcome: "sent", p_message_id: providerMessageId,
        });
        if (error) throw new Error("OUTBOX_COMPLETION_FAILED");
        sent++;
      } else {
        const providerCode = String(responseBody?.error?.code ?? `HTTP_${metaResponse.status}`).slice(0, 100);
        const retry = (metaResponse.status >= 500 || metaResponse.status === 429) && attempt < 6;
        await service.rpc("complete_notification_job", {
          p_outbox_id: jobId, p_worker: workerId, p_outcome: retry ? "retry" : "dead_letter", p_error_code: providerCode,
        });
        failed++;
      }
    } catch {
      await service.rpc("complete_notification_job", {
        p_outbox_id: jobId, p_worker: workerId, p_outcome: "unknown", p_error_code: "PROVIDER_OR_NETWORK_ERROR",
      });
      failed++;
    }
  }
  return json(200, { claimed: jobs?.length ?? 0, sent, skipped, failed });
});
