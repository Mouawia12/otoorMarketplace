import api from '../lib/api';
import { Product } from '../types';

export interface FetchProductsParams {
  type?: string;
  brand?: string;
  category?: string;
  condition?: string;
  sort?: string;
  page?: number;
  page_size?: number;
  search?: string;
  min_price?: number;
  max_price?: number;
  seller?: number;
}

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ProductFiltersMeta {
  brands: string[];
  categories: string[];
  conditions: string[];
  min_price?: number;
  max_price?: number;
}

export interface ProductSuggestion {
  id: number;
  name_ar: string;
  name_en: string;
  brand: string;
  image_url: string | null;
  base_price: number;
}

export const fetchProducts = async (params: FetchProductsParams = {}): Promise<ProductsResponse> => {
  const response = await api.get('/products', { params });
  return response.data;
};

export const fetchProductById = async (id: number): Promise<Product> => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

export const fetchRelatedProducts = async (productId: number, limit = 4): Promise<Product[]> => {
  const response = await api.get(`/products/${productId}/related`, {
    params: { limit },
  });
  return response.data.products;
};

export const fetchProductFiltersMeta = async (): Promise<ProductFiltersMeta> => {
  const response = await api.get('/products/meta');
  return response.data;
};

export const fetchProductSuggestions = async (query: string, limit = 6): Promise<ProductSuggestion[]> => {
  const response = await api.get('/products/suggestions', {
    params: { q: query, limit },
  });
  return response.data?.suggestions ?? [];
};
