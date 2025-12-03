import api from '../lib/api';

export type PromotionType = 'HERO' | 'STRIP' | 'FLOATING';

export interface Promotion {
  id: number;
  type: PromotionType;
  title_en: string;
  title_ar: string;
  subtitle_en?: string | null;
  subtitle_ar?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  badge_text_en?: string | null;
  badge_text_ar?: string | null;
  button_text_en?: string | null;
  button_text_ar?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  background_color?: string | null;
  text_color?: string | null;
  floating_position?: string | null;
  is_active: boolean;
  sort_order?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const fetchPromotions = async () => {
  const response = await api.get<Promotion[]>('/promotions');
  return response.data;
};

export const createPromotion = async (payload: Partial<Promotion>) => {
  const response = await api.post<Promotion>('/promotions', payload);
  return response.data;
};

export const updatePromotion = async (id: number, payload: Partial<Promotion>) => {
  const response = await api.patch<Promotion>(`/promotions/${id}`, payload);
  return response.data;
};

export const deletePromotion = async (id: number) => {
  await api.delete(`/promotions/${id}`);
};

export const fetchActivePromotions = async (types: PromotionType[]) => {
  const params = new URLSearchParams();
  if (types.length) {
    params.set('types', types.join(','));
  }
  const query = params.toString();
  const url = query ? `/promotions/public?${query}` : '/promotions/public';
  const response = await api.get<Promotion[]>(url);
  return response.data;
};
