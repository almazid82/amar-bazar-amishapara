import type { ImageSourcePropType } from "react-native";
import { categoryArt, defaultCategoryArt } from "../data/categoryArt";
import { requireSupabase } from "./supabase";
import type { Category, DeliveryArea, Product, StoreSettings } from "../types";

type CategoryRow = { id: string; parent_id: string | null; name: string; slug: string; sort_order: number; is_active: boolean };
type AreaRow = { id: string; name: string; slug: string; fee: string | number; currency: string; is_active: boolean; effective_from: string | null; effective_until: string | null; sort_order: number };
type ProductRow = {
  id: string; shop_id: string; category_id: string; name: string; description: string | null; image_path: string | null;
  unit_label: string; price: string | number; currency: string; is_active: boolean; is_available: boolean; updated_at: string;
  category: { id: string; name: string; slug: string };
  shop: { id: string; name: string; slug: string; is_active: boolean };
};

function publicImage(path: string | null, fallback: ImageSourcePropType): ImageSourcePropType {
  if (!path) return fallback;
  if (/^https?:\/\//i.test(path)) return { uri: path };
  return { uri: requireSupabase().storage.from("product-media").getPublicUrl(path).data.publicUrl };
}

export async function fetchCatalog() {
  const client = requireSupabase();
  const [categoryResult, productResult] = await Promise.all([
    client.from("categories").select("id,parent_id,name,slug,sort_order,is_active").eq("is_active", true).order("sort_order").order("name"),
    client.from("products").select("id,shop_id,category_id,name,description,image_path,unit_label,price,currency,is_active,is_available,updated_at,category:categories!inner(id,name,slug),shop:shops!inner(id,name,slug,is_active)").eq("is_active", true).eq("is_available", true).eq("shop.is_active", true).eq("category.is_active", true).order("name").limit(250),
  ]);
  if (categoryResult.error) throw categoryResult.error;
  if (productResult.error) throw productResult.error;
  const categoryRows = (categoryResult.data ?? []) as unknown as CategoryRow[];
  const productRows = (productResult.data ?? []) as unknown as ProductRow[];
  const categories: Category[] = categoryRows.map((row) => ({
    id: row.id, slug: row.slug, parentId: row.parent_id, title: row.name, subtitle: "From participating local shops",
    icon: "basket", color: categoryArt[row.slug]?.color ?? defaultCategoryArt.color, image: categoryArt[row.slug]?.image ?? defaultCategoryArt.image,
  }));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const products: Product[] = productRows.filter((row) => row.category && row.shop).map((row) => ({
    id: row.id, name: row.name, categoryId: row.category_id, category: row.category.name, price: Number(row.price), unit: row.unit_label,
    shop: row.shop.name, image: publicImage(row.image_path, categoryById.get(row.category_id)?.image ?? defaultCategoryArt.image),
    description: row.description ?? "Availability and current price are confirmed by the shop before the order is accepted.",
    available: row.is_available, updatedAt: row.updated_at,
  }));
  return { categories, products };
}

export async function fetchDeliveryAreas(): Promise<DeliveryArea[]> {
  const { data, error } = await requireSupabase().from("delivery_areas")
    .select("id,name,slug,fee,currency,is_active,effective_from,effective_until,sort_order")
    .eq("is_active", true).order("sort_order").order("name");
  if (error) throw error;
  const now = Date.now();
  return ((data ?? []) as unknown as AreaRow[])
    .filter((area) => (!area.effective_from || Date.parse(area.effective_from) <= now) && (!area.effective_until || Date.parse(area.effective_until) > now))
    .map((area) => ({ id: area.id, slug: area.slug, name: area.name, fee: Number(area.fee) }));
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  const { data, error } = await requireSupabase().from("store_settings")
    .select("display_name,orders_enabled,cod_enabled,support_phone,support_whatsapp_url").eq("id", true).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("STORE_SETTINGS_MISSING");
  const row = data as { display_name: string; orders_enabled: boolean; cod_enabled: boolean; support_phone: string | null; support_whatsapp_url: string | null };
  return { displayName: row.display_name, ordersEnabled: row.orders_enabled, codEnabled: row.cod_enabled, supportPhone: row.support_phone, whatsappUrl: row.support_whatsapp_url };
}
