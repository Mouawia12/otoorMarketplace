import api from '../lib/api';
import { FooterPageContent, FooterPageKey } from '../types/staticPages';

export type FooterPageStatus = 'DRAFT' | 'PUBLISHED';

export interface FooterPageRecord {
  slug: FooterPageKey;
  status: FooterPageStatus;
  draftContent: FooterPageContent;
  publishedContent: FooterPageContent | null;
  updatedAt: string;
  publishedAt: string | null;
}

export async function fetchPublishedFooterPages() {
  const response = await api.get<{ pages: Array<{ slug: FooterPageKey; content: FooterPageContent }> }>(
    '/footer-pages/public'
  );
  return response.data.pages ?? [];
}

export async function fetchPublishedFooterPage(slug: FooterPageKey) {
  const response = await api.get<{ page: { slug: FooterPageKey; content: FooterPageContent } }>(
    `/footer-pages/public/${slug}`
  );
  return response.data.page;
}

export async function listAdminFooterPages() {
  const response = await api.get<{ pages: FooterPageRecord[] }>('/footer-pages');
  return response.data.pages ?? [];
}

export async function getAdminFooterPage(slug: FooterPageKey) {
  const response = await api.get<{ page: FooterPageRecord }>(`/footer-pages/${slug}`);
  return response.data.page;
}

export async function saveFooterPageDraft(slug: FooterPageKey, content: FooterPageContent) {
  const response = await api.put<{ page: FooterPageRecord }>(`/footer-pages/${slug}/draft`, {
    content,
  });
  return response.data.page;
}

export async function publishFooterPage(slug: FooterPageKey) {
  const response = await api.post<{ page: FooterPageRecord }>(`/footer-pages/${slug}/publish`);
  return response.data.page;
}
