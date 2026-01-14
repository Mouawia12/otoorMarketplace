export type PendingOrderPayload = {
  payment_method: string;
  shipping: {
    name: string;
    phone: string;
    city: string;
    region: string;
    address: string;
    type?: string;
    shipping_method?: string;
    customer_city_code?: string;
    customer_country?: string;
    cod_amount?: number;
    cod_currency?: string;
    torod_shipping_company_id?: string;
    torod_warehouse_id?: string;
    torod_country_id?: string;
    torod_region_id?: string;
    torod_city_id?: string;
    torod_district_id?: string;
    torod_metadata?: Record<string, unknown>;
  };
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice?: number;
  }>;
  coupon_code?: string | null;
  coupon_codes?: string[];
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
