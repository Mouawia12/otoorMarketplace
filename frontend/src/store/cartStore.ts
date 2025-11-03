import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  brand?: string | null;
  qty: number;
  variantId?: string;
  variantLabel?: string;
};

type ShippingMethod = "standard" | "express";

type CartState = {
  items: CartItem[];
  coupon?: { code: string; amount: number } | null;
  shipping: ShippingMethod;
  add: (p: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string, variantId?: string) => void;
  setQty: (id: string, qty: number, variantId?: string) => void;
  clear: () => void;
  setCoupon: (c: CartState["coupon"]) => void;
  setShipping: (m: ShippingMethod) => void;
  totals: () => { sub: number; discount: number; shipping: number; total: number };
  count: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      shipping: "standard",
      add: (p, qty = 1) => {
        const items = [...get().items];
        const idx = items.findIndex((i) => i.id === p.id && i.variantId === p.variantId);
        if (idx >= 0) {
          items[idx].qty += qty;
        } else {
          items.push({ ...p, qty });
        }
        set({ items });
      },
      remove: (id, variantId) =>
        set({
          items: get().items.filter((i) => !(i.id === id && i.variantId === variantId)),
        }),
      setQty: (id, qty, variantId) =>
        set({
          items: get().items.map((i) =>
            i.id === id && i.variantId === variantId ? { ...i, qty: Math.max(1, qty) } : i
          ),
        }),
      clear: () => set({ items: [], coupon: null }),
      setCoupon: (c) => set({ coupon: c }),
      setShipping: (m) => set({ shipping: m }),
      totals: () => {
        const sub = get().items.reduce((s, i) => s + i.price * i.qty, 0);
        const discount = get().coupon?.amount ?? 0;
        const ship = get().shipping === "express" ? 35 : 0;
        const total = Math.max(0, sub - discount) + ship;
        return { sub, discount, shipping: ship, total };
      },
      count: () => get().items.reduce((c, i) => c + i.qty, 0),
    }),
    { name: "cart" }
  )
);
