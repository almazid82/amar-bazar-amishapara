import type { OrderStatus } from "../types";

const labels: Record<OrderStatus, string> = {
  pending_verification: "Waiting for shop check",
  awaiting_customer_approval: "Your approval needed",
  confirmed: "Confirmed",
  preparing: "Being prepared",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  rejected: "Not accepted",
  expired: "Quote expired",
};

export function statusLabel(status: OrderStatus) { return labels[status]; }
