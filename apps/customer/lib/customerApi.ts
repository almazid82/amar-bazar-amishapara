import type { CustomerAddress, CustomerOrder, OrderStatus } from "../types";
import { requireSupabase } from "./supabase";

const orderColumns = "id,public_code,customer_id,status,customer_decision,area_id,area_name_snapshot,recipient_name_snapshot,phone_snapshot,address_snapshot,landmark_snapshot,customer_note,estimated_subtotal,estimated_delivery_fee,estimated_total,final_subtotal,final_delivery_fee,final_total,quote_version,estimated_eta,created_at";
type RawOrder = {
  id: string; public_code: string; customer_id: string; status: OrderStatus; customer_decision: CustomerOrder["customerDecision"];
  area_id: string; area_name_snapshot: string; recipient_name_snapshot: string; phone_snapshot: string; address_snapshot: string;
  landmark_snapshot: string | null; customer_note: string | null; estimated_subtotal: string | number; estimated_delivery_fee: string | number;
  estimated_total: string | number; final_subtotal: string | number | null; final_delivery_fee: string | number | null;
  final_total: string | number | null; quote_version: number; estimated_eta: string | null; created_at: string;
};

function mapOrder(row: RawOrder): CustomerOrder {
  return {
    id: row.id, publicCode: row.public_code, status: row.status, customerDecision: row.customer_decision,
    areaId: row.area_id, areaName: row.area_name_snapshot, recipientName: row.recipient_name_snapshot,
    phone: row.phone_snapshot, addressLine: row.address_snapshot, landmark: row.landmark_snapshot, customerNote: row.customer_note,
    estimatedSubtotal: Number(row.estimated_subtotal), estimatedDeliveryFee: Number(row.estimated_delivery_fee), estimatedTotal: Number(row.estimated_total),
    finalSubtotal: row.final_subtotal == null ? null : Number(row.final_subtotal), finalDeliveryFee: row.final_delivery_fee == null ? null : Number(row.final_delivery_fee),
    finalTotal: row.final_total == null ? null : Number(row.final_total), quoteVersion: row.quote_version, estimatedEta: row.estimated_eta, createdAt: row.created_at,
    items: [], history: [],
  };
}

export async function fetchCustomerAddresses(): Promise<CustomerAddress[]> {
  const { data, error } = await requireSupabase().from("customer_addresses")
    .select("id,customer_id,label,recipient_name,phone_e164,area_id,address_line,landmark,latitude,longitude,is_default")
    .order("is_default", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, customerId: row.customer_id, label: row.label, recipientName: row.recipient_name,
    phone: row.phone_e164, areaId: row.area_id, addressLine: row.address_line, landmark: row.landmark,
    latitude: row.latitude == null ? null : Number(row.latitude), longitude: row.longitude == null ? null : Number(row.longitude), isDefault: row.is_default }));
}

export async function saveCustomerAddress(input: Omit<CustomerAddress, "id" | "customerId">): Promise<CustomerAddress> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("AUTH_REQUIRED");
  const { data, error } = await client.from("customer_addresses").insert({
    customer_id: userId, label: input.label, recipient_name: input.recipientName, phone_e164: input.phone,
    area_id: input.areaId, address_line: input.addressLine, landmark: input.landmark,
    latitude: input.latitude, longitude: input.longitude, is_default: input.isDefault,
  }).select("id,customer_id,label,recipient_name,phone_e164,area_id,address_line,landmark,latitude,longitude,is_default").single();
  if (error) throw error;
  return { id: data.id, customerId: data.customer_id, label: data.label, recipientName: data.recipient_name,
    phone: data.phone_e164, areaId: data.area_id, addressLine: data.address_line, landmark: data.landmark,
    latitude: data.latitude == null ? null : Number(data.latitude), longitude: data.longitude == null ? null : Number(data.longitude), isDefault: data.is_default };
}

export async function deleteCustomerAddress(id: string) {
  const { error } = await requireSupabase().from("customer_addresses").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchCustomerProfile() {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("AUTH_REQUIRED");
  const { data, error } = await client.from("profiles").select("id,display_name,phone_e164").eq("id", authData.user.id).maybeSingle();
  if (error) throw error;
  return { id: authData.user.id, displayName: data?.display_name ?? "", phone: data?.phone_e164 ?? authData.user.phone ?? "" };
}

export async function updateCustomerName(displayName: string) {
  const { error } = await requireSupabase().from("profiles").update({ display_name: displayName.trim() }).
    eq("id", (await requireSupabase().auth.getUser()).data.user?.id ?? "");
  if (error) throw error;
}

export async function submitOrder(body: {
  areaId: string; addressId?: string; recipientName?: string; phone?: string; addressLine?: string; landmark?: string;
  customerNote?: string; items: Array<{ productId: string; quantity: number }>;
}, idempotencyKey: string) {
  const { data, error } = await requireSupabase().functions.invoke("create-order", {
    body,
    headers: { "Idempotency-Key": idempotencyKey },
  });
  if (error) throw await normalizeFunctionError(error);
  if (!data?.orderId || !data?.publicCode || data.status !== "pending_verification") throw new Error("ORDER_RESPONSE_INVALID");
  return data as { orderId: string; publicCode: string; status: "pending_verification"; estimatedSubtotal: string; estimatedDeliveryFee: string; estimatedTotal: string; quoteVersion: number; createdAt: string; replayed: boolean };
}

export async function fetchCustomerOrders(): Promise<CustomerOrder[]> {
  const { data, error } = await requireSupabase().from("orders").select(orderColumns).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return ((data ?? []) as unknown as RawOrder[]).map(mapOrder);
}

export async function fetchCustomerOrder(id: string): Promise<CustomerOrder | null> {
  const client = requireSupabase();
  const { data, error } = await client.from("orders").select(orderColumns).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const order = mapOrder(data as unknown as RawOrder);
  const [itemsResult, historyResult] = await Promise.all([
    client.from("order_items").select("id,requested_name,requested_unit_label,requested_unit_price,quantity,final_unit_price,fulfillment_state").eq("order_id", id).order("created_at"),
    client.from("order_status_history").select("id,from_status,to_status,source,created_at").eq("order_id", id).order("created_at"),
  ]);
  if (itemsResult.error) throw itemsResult.error;
  if (historyResult.error) throw historyResult.error;
  order.items = (itemsResult.data ?? []).map((item) => ({ id: item.id, name: item.requested_name, unit: item.requested_unit_label, quantity: item.quantity,
    requestedUnitPrice: Number(item.requested_unit_price), finalUnitPrice: item.final_unit_price == null ? null : Number(item.final_unit_price), fulfillmentState: item.fulfillment_state }));
  order.history = (historyResult.data ?? []).map((event) => ({ id: event.id, fromStatus: event.from_status as OrderStatus | null,
    toStatus: event.to_status as OrderStatus, source: event.source, createdAt: event.created_at }));
  return order;
}

export async function decideOrderQuote(orderId: string, quoteVersion: number, decision: "approved" | "changes_requested" | "rejected") {
  const { data, error } = await requireSupabase().functions.invoke("customer-order-decision", { body: { orderId, quoteVersion, decision } });
  if (error) throw await normalizeFunctionError(error);
  return data;
}

async function normalizeFunctionError(error: unknown) {
  const context = (error as { context?: unknown })?.context;
  if (typeof Response !== "undefined" && context instanceof Response) {
    const payload = await context.clone().json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
    return new Error(payload?.error?.code ?? payload?.error?.message ?? (error instanceof Error ? error.message : "ORDER_REQUEST_FAILED"));
  }
  return error instanceof Error ? error : new Error("ORDER_REQUEST_FAILED");
}

export function newIdempotencyKey() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export function orderErrorMessage(error: unknown) {
  const text = error instanceof Error ? `${error.message} ${(error as Error & { context?: { body?: unknown } }).context?.body ?? ""}` : String(error ?? "");
  const code = text.toUpperCase();
  if (code.includes("SUPABASE_NOT_CONFIGURED")) return "The app has not been connected to the Amar Bazar backend yet.";
  if (code.includes("AUTH_REQUIRED") || code.includes("401") || code.includes("JWT")) return "Your sign-in expired. Sign in again, then retry this same order.";
  if (code.includes("ORDERS_CLOSED")) return "Ordering is temporarily paused. Your basket is still saved.";
  if (code.includes("ORDERS_DISABLED")) return "Ordering is temporarily paused. Your basket is still saved.";
  if (code.includes("AREA_UNAVAILABLE")) return "That delivery area is not available right now. Choose another active area.";
  if (code.includes("ITEM_UNAVAILABLE") || code.includes("STOCK_CONFLICT")) return "One or more items are no longer available. Refresh the catalog and review your basket.";
  if (code.includes("IDEMPOTENCY_CONFLICT")) return "The previous request changed. Review your checkout details and submit again.";
  if (code.includes("QUOTE_STALE")) return "The shop updated this quote. Refresh the order before deciding.";
  if (code.includes("ADDRESS_INVALID")) return "That saved address is no longer available for this delivery area.";
  if (code.includes("INVALID_INPUT")) return "Some details need correction. Check your phone, delivery address and basket.";
  if (code.includes("ORDER_RESPONSE_INVALID")) return "The server response could not be confirmed. Check your order history before trying again.";
  return "We could not reach the order service. Your basket is saved; retry safely with the same details.";
}
