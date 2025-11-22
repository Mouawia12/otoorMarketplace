import api from '../lib/api';
import { ProductReview } from '../types';

export interface ProductReviewResponse {
  average: number;
  count: number;
  reviews: ProductReview[];
}

export const fetchProductReviews = async (productId: number): Promise<ProductReviewResponse> => {
  const response = await api.get(`/products/${productId}/reviews`);
  return response.data;
};

export const submitProductReview = async (
  productId: number,
  payload: { order_id: number; rating: number; comment?: string }
): Promise<ProductReview> => {
  const response = await api.post(`/products/${productId}/reviews`, payload);
  return response.data;
};
