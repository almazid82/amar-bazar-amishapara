import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { fetchCatalog, fetchDeliveryAreas, fetchStoreSettings } from "../lib/catalog";
import type { Category, DeliveryArea, Product, StoreSettings } from "../types";

type CatalogState = { categories: Category[]; products: Product[]; areas: DeliveryArea[]; settings: StoreSettings | null; loading: boolean; error: string | null; configured: boolean; refresh: () => Promise<void> };
const CatalogContext = createContext<CatalogState | null>(null);

export function CatalogProvider({ children }: React.PropsWithChildren) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); setError("SUPABASE_NOT_CONFIGURED"); return; }
    setLoading(true); setError(null);
    try {
      const [catalog, nextAreas, nextSettings] = await Promise.all([fetchCatalog(), fetchDeliveryAreas(), fetchStoreSettings()]);
      setCategories(catalog.categories); setProducts(catalog.products); setAreas(nextAreas); setSettings(nextSettings);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "CATALOG_LOAD_FAILED");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  const state = useMemo(() => ({ categories, products, areas, settings, loading, error, configured: isSupabaseConfigured, refresh }), [categories, products, areas, settings, loading, error, refresh]);
  return <CatalogContext.Provider value={state}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("useCatalog must be used within CatalogProvider");
  return context;
}
