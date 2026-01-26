import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  brand?: string | null;
  sellerId?: number;
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
  perSellerDiscounts?: Record<string, number>;
};

type CartState = {
  items: CartItem[];
  coupons: AppliedCoupon[];
  couponSellerDiscounts: Record<string, number>;
  couponDiscountTotal: number;
  shipping: ShippingMethod;
  add: (p: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string, variantId?: string) => void;
  setQty: (id: string, qty: number, variantId?: string) => void;
  clear: () => void;
  setCoupons: (payload: {
    coupons: AppliedCoupon[];
    sellerDiscounts?: Record<string, number>;
    totalDiscount?: number;
  }) => void;
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
      couponSellerDiscounts: {},
      couponDiscountTotal: 0,
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
      clear: () =>
        set({ items: [], coupons: [], couponSellerDiscounts: {}, couponDiscountTotal: 0 }),
      setCoupons: ({ coupons, sellerDiscounts, totalDiscount }) =>
        set({
          coupons,
          couponSellerDiscounts: sellerDiscounts ?? {},
          couponDiscountTotal:
            typeof totalDiscount === "number"
              ? totalDiscount
              : coupons.reduce((sum, coupon) => sum + (coupon.amount || 0), 0),
        }),
      removeCoupon: (code) =>
        set((state) => {
          const coupons = state.coupons.filter(
            (coupon) => coupon.code.toUpperCase() !== code.toUpperCase()
          );
          const couponDiscountTotal = coupons.reduce(
            (sum, coupon) => sum + (coupon.amount || 0),
            0
          );
          return {
            coupons,
            couponDiscountTotal,
            couponSellerDiscounts: {},
          };
        }),
      setShipping: (m) => set({ shipping: m }),
      totals: () => {
        const sub = get().items.reduce((s, i) => s + i.price * i.qty, 0);
        const sellerSubtotals = get().items.reduce<Record<string, number>>((acc, item) => {
          if (typeof item.sellerId !== "number" || !Number.isFinite(item.sellerId)) {
            return acc;
          }
          const key = String(item.sellerId);
          acc[key] = (acc[key] ?? 0) + item.price * item.qty;
          return acc;
        }, {});

        const sellerDiscounts = get().couponSellerDiscounts;
        const hasSellerDiscounts = Object.keys(sellerDiscounts).length > 0;
        const hasSellerSubtotals = Object.keys(sellerSubtotals).length > 0;

        const totalDiscount = hasSellerDiscounts && hasSellerSubtotals
          ? Object.entries(sellerSubtotals).reduce((sum, [sellerId, subtotal]) => {
              const sellerDiscount = sellerDiscounts[sellerId] ?? 0;
              return sum + Math.min(subtotal, sellerDiscount);
            }, 0)
          : get().couponDiscountTotal;

        const discount = Math.min(totalDiscount, sub);
        const ship = get().shipping === "express" ? 35 : 0;
        const total = Math.max(0, sub - discount) + ship;
        return { sub, discount, shipping: ship, total };
      },
      count: () => get().items.reduce((c, i) => c + i.qty, 0),
    }),
    {
      name: "cart",
      version: 2,
      migrate: (state: any, version) => {
        if (!state || version >= 2) {
          return state;
        }
        return {
          ...state,
          couponSellerDiscounts: {},
          couponDiscountTotal: Array.isArray(state.coupons)
            ? state.coupons.reduce((sum: number, coupon: AppliedCoupon) => sum + (coupon.amount || 0), 0)
            : 0,
        };
      },
    }
  )
);
