import matter from 'gray-matter';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Buffer } from 'buffer';

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

// Load all markdown files
const modules = import.meta.glob('/src/content/blog/*.md', { 
  query: '?raw',
  import: 'default',
  eager: true 
});

// Parse all posts
const allPosts: BlogPost[] = Object.entries(modules).map(([_, raw]) => {
  const { data, content } = matter(raw as string);
  const html = DOMPurify.sanitize(marked(content) as string);
  
  return {
    slug: data.slug,
    title: data.title,
    description: data.description,
    cover: data.cover || '/images/blog/placeholder.jpg',
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

/**
 * Get all published posts, sorted by date (DESC)
 */
export function getAllPosts(includeStatus?: 'published' | 'draft' | 'all'): BlogPost[] {
  const status = includeStatus || 'published';
  
  let filtered = allPosts;
  if (status !== 'all') {
    filtered = allPosts.filter(p => p.status === status);
  }
  
  return filtered.sort((a, b) => 
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
  const post = allPosts.find(p => p.slug === slug && p.lang === lang);
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
