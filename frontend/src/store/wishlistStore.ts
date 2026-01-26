import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WishItem = {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  brand?: string | null;
  sellerId?: number;
};

type WishlistState = {
  items: WishItem[];
  add: (p: WishItem) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  count: () => number;
  clear: () => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (p) => {
        if (!get().items.some((i) => i.id === p.id)) {
          set({ items: [...get().items, p] });
        }
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      has: (id) => get().items.some((i) => i.id === id),
      count: () => get().items.length,
      clear: () => set({ items: [] }),
    }),
    { name: "wishlist" }
  )
);
