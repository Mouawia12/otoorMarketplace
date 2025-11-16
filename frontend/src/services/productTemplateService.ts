import api from '../lib/api';
import { ProductTemplate } from '../types';

export const adminListTemplates = async (params?: Record<string, unknown>) => {
  const { data } = await api.get<ProductTemplate[]>('/admin/product-templates', { params });
  return data;
};

export const adminGetTemplate = async (id: number) => {
  const { data } = await api.get<ProductTemplate>(`/admin/product-templates/${id}`);
  return data;
};

export const adminCreateTemplate = async (payload: Record<string, unknown>) => {
  const { data } = await api.post<ProductTemplate>('/admin/product-templates', payload);
  return data;
};

export const adminUpdateTemplate = async (id: number, payload: Record<string, unknown>) => {
  const { data } = await api.patch<ProductTemplate>(`/admin/product-templates/${id}`, payload);
  return data;
};

export const adminDeleteTemplate = async (id: number) => {
  await api.delete(`/admin/product-templates/${id}`);
};

export const sellerSearchTemplates = async (params?: Record<string, unknown>) => {
  const { data } = await api.get<ProductTemplate[]>('/seller/product-templates', { params });
  return data;
};

export const sellerGetTemplate = async (id: number) => {
  const { data } = await api.get<ProductTemplate>(`/seller/product-templates/${id}`);
  return data;
};
