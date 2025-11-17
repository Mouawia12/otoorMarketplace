import matter from 'gray-matter';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Buffer } from 'buffer';
import { BLOG_PLACEHOLDER, resolveStaticAssetUrl } from '../utils/staticAssets';

// Make Buffer available globally for gray-matter
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  cover: string;
  author: string;
  category: string;
  tags: string[];
  date: string;
  lang: 'ar' | 'en';
  status: 'published' | 'draft';
  content: string;
  html: string;
  readingTime: number;
}

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

type StoredAdminPost = {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover?: string;
  coverData?: string;
  author?: string;
  category?: string;
  tags: string;
  lang: 'ar' | 'en';
  date: string;
  status: 'published' | 'draft';
  content: string;
};

const STORAGE_KEY = "admin_blog_posts";

// Load all markdown files
const modules = import.meta.glob('/src/content/blog/*.md', { 
  query: '?raw',
  import: 'default',
  eager: true 
});

const parseMarkdownPosts = (): BlogPost[] =>
  Object.entries(modules).map(([_, raw]) => {
    const { data, content } = matter(raw as string);
    const html = DOMPurify.sanitize(marked(content) as string);

    const cover = resolveStaticAssetUrl(data.cover) || BLOG_PLACEHOLDER;

    return {
      slug: data.slug,
      title: data.title,
      description: data.description,
      cover,
      author: data.author,
      category: data.category,
      tags: data.tags || [],
      date: data.date,
      lang: data.lang,
      status: data.status || 'draft',
      content,
      html,
      readingTime: estimateReadingTime(content),
    };
  });

const parseStoredAdminPosts = (): BlogPost[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as StoredAdminPost[];
    return stored.map((p) => {
      const content = p.content || "";
      const html = DOMPurify.sanitize(marked(content) as string);
      const cover = p.coverData || p.cover || BLOG_PLACEHOLDER;
      return {
        slug: p.slug || p.id,
        title: p.title,
        description: p.description,
        cover,
        author: p.author || "",
        category: p.category || "",
        tags: p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        date: p.date,
        lang: p.lang,
        status: p.status || "draft",
        content,
        html,
        readingTime: estimateReadingTime(content),
      };
    });
  } catch (_e) {
    return [];
  }
};

const getSources = (): BlogPost[] => {
  const stored = parseStoredAdminPosts();
  if (stored.length > 0) {
    return stored;
  }
  return parseMarkdownPosts();
};

const filterByStatus = (posts: BlogPost[], status: 'published' | 'draft' | 'all') => {
  if (status === 'all') return posts;
  return posts.filter((p) => p.status === status);
};

/**
 * Get all published posts, sorted by date (DESC)
 */
export function getAllPosts(includeStatus?: 'published' | 'draft' | 'all'): BlogPost[] {
  const status = includeStatus || 'published';
  const posts = filterByStatus(getSources(), status);

  return posts.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Get posts by language
 */
export function getPostsByLang(lang: 'ar' | 'en', includeStatus?: 'published' | 'draft' | 'all'): BlogPost[] {
  return getAllPosts(includeStatus).filter(p => p.lang === lang);
}

/**
 * Get a single post by slug and language
 */
export function getPostBySlug(slug: string, lang: 'ar' | 'en'): BlogPost | null {
  const post = getSources().find(p => p.slug === slug && p.lang === lang && p.status === 'published');
  return post || null;
}

/**
 * Get posts by category
 */
export function getPostsByCategory(category: string, lang: 'ar' | 'en'): BlogPost[] {
  return getPostsByLang(lang, 'published').filter(p => p.category === category);
}

/**
 * Get posts by tag
 */
export function getPostsByTag(tag: string, lang: 'ar' | 'en'): BlogPost[] {
  return getPostsByLang(lang, 'published').filter(p => p.tags.includes(tag));
}

/**
 * Get posts by author
 */
export function getPostsByAuthor(author: string, lang: 'ar' | 'en'): BlogPost[] {
  return getPostsByLang(lang, 'published').filter(p => p.author === author);
}

/**
 * Get related posts (same category or tags, excluding current post)
 */
export function getRelated(slug: string, lang: 'ar' | 'en', limit = 3): BlogPost[] {
  const current = getPostBySlug(slug, lang);
  if (!current) return [];

  const posts = getPostsByLang(lang, 'published').filter(p => p.slug !== slug);
  
  // Score posts by relevance
  const scored = posts.map(p => {
    let score = 0;
    if (p.category === current.category) score += 3;
    score += p.tags.filter(t => current.tags.includes(t)).length;
    return { post: p, score };
  });
  
  // Sort by score DESC, then date DESC
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.post.date).getTime() - new Date(a.post.date).getTime();
  });
  
  return scored.slice(0, limit).map(s => s.post);
}

/**
 * Search posts by text (title, description, content)
 */
export function searchPosts(query: string, lang: 'ar' | 'en'): BlogPost[] {
  if (!query.trim()) return getPostsByLang(lang, 'published');
  
  const q = query.toLowerCase();
  return getPostsByLang(lang, 'published').filter(p => 
    p.title.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.content.toLowerCase().includes(q)
  );
}

/**
 * Estimate reading time (words per minute)
 */
export function estimateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Extract Table of Contents from HTML (H2 and H3 tags)
 */
export function extractToc(html: string): TOCItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const headings = doc.querySelectorAll('h2, h3');
  
  const toc: TOCItem[] = [];
  headings.forEach((heading, index) => {
    const text = heading.textContent || '';
    const id = `heading-${index}`;
    heading.id = id;
    
    toc.push({
      id,
      text,
      level: heading.tagName === 'H2' ? 2 : 3,
    });
  });
  
  return toc;
}

/**
 * Get all unique categories
 */
export function getAllCategories(lang: 'ar' | 'en'): string[] {
  const posts = getPostsByLang(lang, 'published');
  return Array.from(new Set(posts.map(p => p.category)));
}

/**
 * Get all unique tags
 */
export function getAllTags(lang: 'ar' | 'en'): string[] {
  const posts = getPostsByLang(lang, 'published');
  const tags = posts.flatMap(p => p.tags);
  return Array.from(new Set(tags));
}

/**
 * Get all unique authors
 */
export function getAllAuthors(lang: 'ar' | 'en'): string[] {
  const posts = getPostsByLang(lang, 'published');
  return Array.from(new Set(posts.map(p => p.author)));
}
