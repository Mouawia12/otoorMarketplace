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

type ShippingMethod = "standard" | "express" | "torod";

type CouponMeta = {
  discount_type: "percentage" | "fixed";
  discount_value: number;
  seller_id?: number | null;
};

type AppliedCoupon = {
  code: string;
  amount: number;
  meta: CouponMeta;
};

type CartState = {
  items: CartItem[];
  coupons: AppliedCoupon[];
  shipping: ShippingMethod;
  add: (p: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string, variantId?: string) => void;
  setQty: (id: string, qty: number, variantId?: string) => void;
  clear: () => void;
  setCoupons: (c: AppliedCoupon[]) => void;
  removeCoupon: (code: string) => void;
  setShipping: (m: ShippingMethod) => void;
  totals: () => { sub: number; discount: number; shipping: number; total: number };
  count: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      coupons: [],
      shipping: "torod",
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
      clear: () => set({ items: [], coupons: [] }),
      setCoupons: (c) => set({ coupons: c }),
      removeCoupon: (code) =>
        set({
          coupons: get().coupons.filter(
            (coupon) => coupon.code.toUpperCase() !== code.toUpperCase()
          ),
        }),
      setShipping: (m) => set({ shipping: m }),
      totals: () => {
        const sub = get().items.reduce((s, i) => s + i.price * i.qty, 0);
        const totalDiscount = get().coupons.reduce(
          (sum, coupon) => sum + (coupon.amount || 0),
          0
        );
        const discount = Math.min(totalDiscount, sub);
        const ship = get().shipping === "express" ? 35 : 0;
        const total = Math.max(0, sub - discount) + ship;
        return { sub, discount, shipping: ship, total };
      },
      count: () => get().items.reduce((c, i) => c + i.qty, 0),
    }),
    { name: "cart" }
  )
);
