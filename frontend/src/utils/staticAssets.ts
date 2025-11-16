import placeholderPerfume from '@/assets/images/placeholder-perfume.svg?url';
import blogPlaceholder from '@/assets/images/blog/placeholder.jpg?url';
import blogPerfumeCare from '@/assets/images/blog/perfume-care.jpg?url';
import blogNiche from '@/assets/images/blog/niche-perfumes.jpg?url';
import blogSeasonal from '@/assets/images/blog/seasonal-perfumes.jpg?url';

const assetMap: Record<string, string> = {
  '/images/placeholder-perfume.svg': placeholderPerfume,
  '/images/placeholder-perfume.jpg': placeholderPerfume,
  '/placeholder-perfume.svg': placeholderPerfume,
  '/placeholder-perfume.jpg': placeholderPerfume,
  'placeholder-perfume.svg': placeholderPerfume,
  'placeholder-perfume.jpg': placeholderPerfume,

  '/images/blog/placeholder.jpg': blogPlaceholder,
  '/images/blog/perfume-care.jpg': blogPerfumeCare,
  '/images/blog/niche-perfumes.jpg': blogNiche,
  '/images/blog/seasonal-perfumes.jpg': blogSeasonal,
  'images/blog/placeholder.jpg': blogPlaceholder,
  'images/blog/perfume-care.jpg': blogPerfumeCare,
  'images/blog/niche-perfumes.jpg': blogNiche,
  'images/blog/seasonal-perfumes.jpg': blogSeasonal,
};

const shouldNormalize = (value: string) =>
  !/^https?:\/\//i.test(value) && !value.startsWith('data:');

const normalizeKey = (value: string) => {
  if (!shouldNormalize(value)) return value;
  return value.startsWith('/') ? value : `/${value}`;
};

export const getStaticAssetUrl = (path: string) => {
  const key = normalizeKey(path);
  return assetMap[key] || key;
};

export const resolveStaticAssetUrl = (value?: string | null) => {
  if (!value) return '';
  const key = normalizeKey(value);
  return assetMap[key] || value;
};

export const PLACEHOLDER_PERFUME_KEY = '/images/placeholder-perfume.svg';
export const BLOG_PLACEHOLDER_KEY = '/images/blog/placeholder.jpg';
export const PLACEHOLDER_PERFUME = assetMap[PLACEHOLDER_PERFUME_KEY];
export const BLOG_PLACEHOLDER = assetMap[BLOG_PLACEHOLDER_KEY];
