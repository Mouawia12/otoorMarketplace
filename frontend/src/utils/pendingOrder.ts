export type PendingOrderPayload = {
  payment_method: string;
  shipping: {
    name: string;
    phone: string;
    city: string;
    region: string;
    address: string;
    type?: string;
    redbox_point_id?: string;
    redbox_city_code?: string;
    customer_city_code?: string;
    customer_country?: string;
    cod_amount?: number;
    cod_currency?: string;
  };
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice?: number;
  }>;
  coupon_code?: string | null;
  discount_amount?: number;
  shipping_fee?: number;
};

const STORAGE_KEY = "pending_order_payload";

export const savePendingOrder = (payload: PendingOrderPayload) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const loadPendingOrder = (): PendingOrderPayload | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearPendingOrder = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
};
