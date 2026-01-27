export interface User {
  id: number;
  email: string;
  full_name: string;
  roles: string[];
  status: string;
  seller_status?: string;
  seller_profile_status?: string;
  seller_profile?: {
    status?: string;
    full_name?: string;
    phone?: string;
    city?: string;
    address?: string;
    national_id?: string;
    iban?: string;
    bank_name?: string;
    torod_warehouse_id?: string | null;
  } | null;
  seller_profile_submitted?: boolean;
  verified_seller?: boolean;
  requires_password_reset?: boolean;
}

export interface Product {
  id: number;
  seller_id: number;
  seller?: { id: number; full_name: string; verified_seller: boolean };
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  product_type: string;
  brand: string;
  category: string;
  base_price: number;
  size_ml: number;
  weight_kg?: number | null;
  concentration: string;
  condition?: 'new' | 'used';
  stock_quantity: number;
  is_tester?: boolean;
  image_urls: string[];
  status: string;
  created_at: string;
  updated_at: string;
  seller_warehouse_id?: number | null;
  seller_warehouse?: {
    id: number;
    warehouse_code: string;
    warehouse_name: string;
  };
  rating_avg?: number;
  rating_count?: number;
  is_auction_product?: boolean;
  has_active_auction?: boolean;
}

export interface ProductTemplate {
  id: number;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  product_type: string;
  brand: string;
  category: string;
  base_price: number;
  size_ml: number;
  concentration: string;
  image_urls: string[];
  created_at?: string;
  updated_at?: string;
  created_by?: {
    id: number;
    full_name: string;
  };
}

export interface Auction {
  id: number;
  product_id: number;
  seller_id: number;
  starting_price: number;
  current_price: number;
  minimum_increment: number;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  updated_at: string;
  product?: Product;
  seller?: { id: number; full_name: string; verified_seller: boolean };
  total_bids?: number;
  winner?: {
    bid_id: number;
    bidder_id: number;
    amount: number;
    bidder?: { id: number; full_name: string; email: string };
  } | null;
}

export interface Bid {
  id: number;
  auction_id: number;
  bidder_id: number;
  amount: number;
  created_at: string;
  bidder?: User;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  vendor_order_id?: number | null;
  warehouse_code?: string | null;
  buyer_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  payment_method_id?: number | null;
  payment_method_code?: string | null;
  payment_status?: string | null;
  payment_url?: string | null;
  shipping_address: string;
  shipping_name?: string;
  shipping_phone?: string;
  shipping_city?: string;
  shipping_region?: string;
  shipping_method?: string;
  shipping_fee?: number;
  status: string;
  created_at: string;
  product?: Product;
  torod_order_id?: string | null;
  torod_shipment_id?: string | null;
  torod_tracking_number?: string | null;
  torod_label_url?: string | null;
  torod_status?: string | null;
  vendor_orders?: VendorOrder[];
  items?: Array<{
    id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    product?: Product;
  }>;
}

export interface VendorOrder {
  id: number;
  seller_id: number;
  status: string;
  shipping_method?: string | null;
  shipping_company_id?: number | null;
  warehouse_code?: string | null;
  shipper_city_id?: number | null;
  torod_order_id?: string | null;
  tracking_number?: string | null;
  label_url?: string | null;
  torod_status?: string | null;
  subtotal_amount: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  platform_fee?: number;
  items?: Array<{
    id: number;
    order_item_id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export interface ProductReview {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  user?: {
    id: number;
    full_name: string;
  };
}

export interface SupportReply {
  id: number;
  ticket_id: number;
  user_id: number;
  message: string;
  created_at: string;
  user?: {
    id: number;
    full_name: string;
    email?: string;
  };
}

export interface SupportTicket {
  id: number;
  user_id: number;
  subject: string;
  message: string;
  status: string;
  role?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    full_name: string;
    email?: string;
  };
  replies?: SupportReply[];
}

export interface ManualShipment {
  id: number;
  user_id: number;
  torod_order_id?: string | null;
  tracking_number?: string | null;
  label_url?: string | null;
  status?: string | null;
  warehouse_code: string;
  warehouse_name?: string | null;
  courier_partner_id?: number | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  address: string;
  country_id?: number | null;
  region_id?: number | null;
  city_id?: number | null;
  district_id?: number | null;
  order_total: number;
  weight: number;
  no_of_box: number;
  payment: string;
  item_description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModerationQueueItem {
  id: string;
  item_id: number;
  type: 'product' | 'order' | 'auction';
  title_en: string;
  title_ar: string;
  created_at: string;
  priority: 'low' | 'medium' | 'high';
}

export interface BankTransferSettings {
  bankName: string;
  accountName: string;
  iban: string;
  swift: string;
  instructions: string;
}

export interface PlatformSettings {
  commissionNew: number;
  commissionUsed: number;
  commissionAuction: number;
  authenticityFee: number;
  notificationsEnabled: boolean;
  language: "ar" | "en";
  theme: "light" | "dark";
}

export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  twitter?: string;
  youtube?: string;
  snapchat?: string;
  linkedin?: string;
  whatsapp?: string;
}
