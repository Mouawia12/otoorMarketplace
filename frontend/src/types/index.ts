export interface User {
  id: number;
  email: string;
  full_name: string;
  roles: string[];
  status: string;
}

export interface Product {
  id: number;
  seller_id: number;
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
  condition?: 'new' | 'used';
  stock_quantity: number;
  image_urls: string[];
  status: string;
  created_at: string;
  updated_at: string;
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
  product?: Product;
  seller?: { id: number; full_name: string; verified_seller: boolean };
  total_bids?: number;
}

export interface Bid {
  id: number;
  auction_id: number;
  bidder_id: number;
  amount: number;
  created_at: string;
  bidder?: User;
}

export interface Order {
  id: number;
  buyer_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  shipping_address: string;
  status: string;
  created_at: string;
  product?: Product;
}
