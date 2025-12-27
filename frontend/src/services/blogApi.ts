import DOMPurify from 'dompurify';
import { marked } from 'marked';
import api from '../lib/api';

export type BlogPost = {
  id: number;
  title: string;
  slug: string;
  description: string;
  cover: string;
  author: string;
  category: string;
  tags: string[];
  content: string;
  status: 'published' | 'draft';
  lang: 'ar' | 'en';
  date: string;
  html?: string;
  readingTime?: number;
};

const cache: Record<string, BlogPost[]> = {};

const looksLikeHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

const sanitizeHtml = (content: string) => {
  const raw = content || '';
  if (looksLikeHtml(raw)) {
    return DOMPurify.sanitize(raw);
  }
  return DOMPurify.sanitize(marked(raw) as string);
};

const extractText = (html: string) => {
  if (typeof window !== 'undefined' && 'DOMParser' in window) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }
  return html.replace(/<[^>]*>/g, ' ');
};

const estimateReadingTime = (text: string): number => {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words / wordsPerMinute);
};

export async function fetchPosts(lang: 'ar' | 'en', status: 'published' | 'draft' | 'all' = 'published'): Promise<BlogPost[]> {
  const key = `${lang}-${status}`;
  if (cache[key]) return cache[key];
  const res = await api.get('/blog', { params: { lang, status } });
  const posts = (res.data as BlogPost[]).map((p) => {
    const normalizedStatus: 'published' | 'draft' =
      (p.status as string).toLowerCase() === 'published' ? 'published' : 'draft';
    const normalizedLang: 'ar' | 'en' =
      (p.lang as string).toLowerCase() === 'ar' ? 'ar' : 'en';
    return {
      ...p,
      lang: normalizedLang,
      status: normalizedStatus,
      html: sanitizeHtml(p.content),
      readingTime: estimateReadingTime(extractText(p.content)),
    };
  });
  cache[key] = posts;
  return posts;
}

export async function fetchPost(slug: string, lang: 'ar' | 'en'): Promise<BlogPost | null> {
  try {
    const res = await api.get(`/blog/${slug}`, { params: { lang } });
    const p = res.data as BlogPost;
    const normalizedStatus: 'published' | 'draft' =
      (p.status as string).toLowerCase() === 'published' ? 'published' : 'draft';
    const normalizedLang: 'ar' | 'en' =
      (p.lang as string).toLowerCase() === 'ar' ? 'ar' : 'en';
    return {
      ...p,
      lang: normalizedLang,
      status: normalizedStatus,
      html: sanitizeHtml(p.content),
      readingTime: estimateReadingTime(extractText(p.content)),
    };
  } catch (_err) {
    return null;
  }
}

export function clearBlogCache() {
  Object.keys(cache).forEach((k) => delete cache[k]);
}
