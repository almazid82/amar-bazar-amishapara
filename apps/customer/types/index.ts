import type { ImageSourcePropType } from "react-native";

export type Category = {
  id: string;
  slug?: string;
  parentId?: string | null;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  image: ImageSourcePropType;
};

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  price: number;
  unit: string;
  shop: string;
  image: ImageSourcePropType;
  badge?: string;
  description: string;
  available?: boolean;
  updatedAt?: string;
};

export type DeliveryArea = { id: string; slug?: string; name: string; fee: number };
export type CartLine = { productId: string; quantity: number };
export type SavedAddress = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  area: string;
  address: string;
  landmark?: string;
};

export type DemoOrder = {
  id: string;
  publicCode: string;
  createdAt: string;
  status: "preview";
  area: string;
  fee: number;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
};

export type StoreSettings = {
  displayName: string;
  ordersEnabled: boolean;
  codEnabled: boolean;
  supportPhone: string | null;
  whatsappUrl: string | null;
};

export type OrderStatus = "pending_verification" | "awaiting_customer_approval" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled" | "rejected" | "expired";

export type CustomerAddress = {
  id: string;
  customerId: string;
  label: string;
  recipientName: string;
  phone: string;
  areaId: string;
  addressLine: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
};

export type CustomerOrder = {
  id: string;
  publicCode: string;
  status: OrderStatus;
  customerDecision: "pending" | "approved" | "changes_requested" | "rejected";
  areaId: string;
  areaName: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  landmark: string | null;
  customerNote: string | null;
  estimatedSubtotal: number;
  estimatedDeliveryFee: number;
  estimatedTotal: number;
  finalSubtotal: number | null;
  finalDeliveryFee: number | null;
  finalTotal: number | null;
  quoteVersion: number;
  estimatedEta: string | null;
  createdAt: string;
  items: Array<{ id: string; name: string; unit: string; quantity: number; requestedUnitPrice: number; finalUnitPrice: number | null; fulfillmentState: string }>;
  history: Array<{ id: number; fromStatus: OrderStatus | null; toStatus: OrderStatus; source: string; createdAt: string }>;
};
