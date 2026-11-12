import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useCatalog } from "./CatalogContext";
import type { CartLine } from "../types";

type CartContextValue = {
  cart: CartLine[]; cartCount: number; subtotal: number; catalogReady: boolean;
  addToCart: (productId: string) => void; setQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void; clearCart: () => void;
};

const STORAGE_KEY = "amar-bazar-customer-cart-v2";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: React.PropsWithChildren) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { products } = useCatalog();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value) {
        const parsed: unknown = JSON.parse(value);
        if (Array.isArray(parsed)) setCart(parsed.filter((line): line is CartLine => Boolean(line && typeof line.productId === "string" && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 99)));
      }
    }).catch(() => undefined).finally(() => setLoaded(true));
  }, []);

  useEffect(() => { if (loaded) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cart)).catch(() => undefined); }, [cart, loaded]);
  const addToCart = useCallback((productId: string) => {
    setCart((current) => {
      const found = current.find((line) => line.productId === productId);
      return found ? current.map((line) => line.productId === productId ? { ...line, quantity: Math.min(99, line.quantity + 1) } : line) : [...current, { productId, quantity: 1 }];
    });
  }, []);
  const setQuantity = useCallback((productId: string, quantity: number) => {
    setCart((current) => quantity <= 0 ? current.filter((line) => line.productId !== productId) : current.map((line) => line.productId === productId ? { ...line, quantity: Math.min(99, quantity) } : line));
  }, []);
  const removeFromCart = useCallback((productId: string) => setCart((current) => current.filter((line) => line.productId !== productId)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const subtotal = cart.reduce((sum, line) => sum + (productsById.get(line.productId)?.price ?? 0) * line.quantity, 0);
  const value = useMemo(() => ({ cart, cartCount: cart.reduce((sum, line) => sum + line.quantity, 0), subtotal, catalogReady: loaded, addToCart, setQuantity, removeFromCart, clearCart }),
    [cart, subtotal, loaded, addToCart, setQuantity, removeFromCart, clearCart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
