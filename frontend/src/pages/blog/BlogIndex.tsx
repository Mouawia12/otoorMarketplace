import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useUIStore } from '../../store/uiStore';
import { BLOG_PLACEHOLDER } from '../../utils/staticAssets';
import { resolveImageUrl } from '../../utils/image';
import { fetchPosts, BlogPost } from '../../services/blogApi';

const POSTS_PER_PAGE = 12;

/** خرائط سلاجز معروفة -> مفاتيح ترجمة تحت blog.* */
const KNOWN_MAP: Record<string, string> = {
  guides: 'guides',
  tips: 'tips',
  care: 'care',
  seasonal: 'seasonal',
  storage: 'storage',
  luxury: 'luxuryPerfume',
  luxury_perfume: 'luxuryPerfume',
  buying_guide: 'buyingGuide',
  buyingguide: 'buyingGuide',
};

function normalizeSlug(s: string) {
  return (s || '').replace(/-/g, '_').toLowerCase();
}

/** ترجمة slug إلى نص قابل للعرض */
function translateBlogKey(t: (k: string, o?: any) => string, slug?: string) {
  if (!slug) return '';
  const norm = normalizeSlug(slug);
  const key = KNOWN_MAP[norm];
  if (key) return t(`blog.${key}`);
  // فالباك جميل لو ما كان له مفتاح ترجمة:
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function BlogIndex() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchPosts(language, 'published');
        setPosts(data);
      } catch (error) {
        console.error("Failed to load blog posts", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [language]);

  const categories = useMemo(
    () => Array.from(new Set(posts.map((p) => p.category).filter(Boolean))),
    [posts]
  );
  const tags = useMemo(
    () => Array.from(new Set(posts.flatMap((p) => p.tags || []).filter(Boolean))),
    [posts]
  );

  const filteredPosts = useMemo(() => {
    let filtered = posts;

    if (selectedCategory) {
      filtered = filtered.filter((p) => normalizeSlug(p.category) === normalizeSlug(selectedCategory));
    }

    if (selectedTag) {
      filtered = filtered.filter((p) => (p.tags || []).some((tg: string) => normalizeSlug(tg) === normalizeSlug(selectedTag)));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [posts, selectedCategory, selectedTag, searchQuery]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const pageTitle = t('blog.title');
  const pageDesc = t('blog.desc');
  const canonicalUrl = `${window.location.origin}/blog`;

  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: pageTitle,
    description: pageDesc,
    url: canonicalUrl,
    publisher: {
      '@type': 'Organization',
      name: t('common.siteName'),
      logo: {
        '@type': 'ImageObject',
        url: `${window.location.origin}/logo.png`,
      },
    },
    blogPost: posts.slice(0, 10).map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      url: `${window.location.origin}/blog/${post.slug}`,
      datePublished: post.date,
      author: {
        '@type': 'Person',
        name: post.author,
      },
    })),
  };

  return (
    <>
      <Helmet>
        <title>
          {pageTitle} | {t('common.siteName')}
        </title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <link
          rel="alternate"
          hrefLang="ar"
          href={`${window.location.origin}/blog?lang=ar`}
        />
        <link
          rel="alternate"
          hrefLang="en"
          href={`${window.location.origin}/blog?lang=en`}
        />
        <link
          rel="alternate"
          hrefLang="x-default"
          href={`${window.location.origin}/blog`}
        />

        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />

        <script type="application/ld+json">{JSON.stringify(blogSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-sand py-12 sm:py-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal mb-3 sm:mb-4">
              {t('blog.title')}
            </h1>
            <p className="text-base sm:text-lg text-taupe max-w-2xl mx-auto">{t('blog.desc')}</p>
          </div>

          {/* Filters */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              {/* Search */}
              <input
                type="text"
                placeholder={t('blog.search')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 px-4 py-3 text-sm sm:text-base border border-charcoal-light rounded-luxury focus:outline-none focus:border-gold"
              />

              {/* Category Filter (مُترجم للعرض) */}
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-3 text-sm sm:text-base border border-charcoal-light rounded-luxury focus:outline-none focus:border-gold bg-white"
              >
                <option value="">{t('blog.allCategories')}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {translateBlogKey(t, cat)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tag Filter (مُترجم للعرض) */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSelectedTag('');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-2 rounded-full text-sm transition ${
                    !selectedTag
                      ? 'bg-gold text-charcoal'
                      : 'bg-ivory text-taupe hover:bg-charcoal-light'
                  }`}
                >
                  {t('blog.allTags')}
                </button>
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTag(tag);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-2 rounded-full text-sm transition ${
                      normalizeSlug(selectedTag) === normalizeSlug(tag)
                        ? 'bg-gold text-charcoal'
                        : 'bg-ivory text-taupe hover:bg-charcoal-light'
                    }`}
                  >
                    {translateBlogKey(t, tag)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results Count */}
          <p className="text-taupe mb-6 text-sm sm:text-base">
            {t('blog.showingResults', { count: filteredPosts.length })}
          </p>

          {/* Posts Grid */}
          {loading ? (
            <div className="text-center py-12 sm:py-16">
              <p className="text-lg sm:text-xl text-taupe">{t('common.loading')}</p>
            </div>
          ) : paginatedPosts.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <p className="text-lg sm:text-xl text-taupe">{t('blog.noPosts')}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-10 sm:mb-12">
              {paginatedPosts.map((post) => {
                const coverSrc =
                  post.cover && !post.cover.startsWith('data:') && !post.cover.startsWith('blob:')
                    ? resolveImageUrl(post.cover) || BLOG_PLACEHOLDER
                    : post.cover || BLOG_PLACEHOLDER;
                return (
                <Link
                  key={`${post.slug}-${(post as any).lang || language}`}
                  to={`/blog/${post.slug}`}
                  className="group bg-ivory rounded-luxury overflow-hidden shadow-sm hover:shadow-luxury transition-all duration-300"
                >
                  {/* Cover Image */}
                  <div className="aspect-[16/9] overflow-hidden bg-sand">
                    <img
                      src={coverSrc}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = BLOG_PLACEHOLDER;
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-taupe mb-2.5 sm:mb-3">
                      <span>
                        {new Date(post.date).toLocaleDateString(
                          i18n.language === 'ar' ? 'ar-SA' : 'en-US',
                          { year: 'numeric', month: 'long', day: 'numeric' }
                        )}
                      </span>
                      <span>•</span>
                      <span>
                        <span className="hidden sm:inline">{post.readingTime || 2} </span>
                        {t('blog.minRead_other', { count: post.readingTime || 2 })}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-charcoal mb-2 group-hover:text-gold transition line-clamp-2">
                      {post.title}
                    </h3>

                    <p className="text-sm sm:text-base text-taupe line-clamp-3 mb-3 sm:mb-4">
                      {post.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gold font-semibold">
                        {translateBlogKey(t, post.category)}
                      </span>
                      <span className="text-gold group-hover:translate-x-1 transition-transform inline-block">
                        {i18n.language === 'ar' ? '←' : '→'}
                      </span>
                    </div>
                  </div>
                </Link>
              );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-charcoal-light rounded-lg hover:bg-charcoal-light transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {i18n.language === 'ar' ? '→' : '←'}
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg transition ${
                    currentPage === page
                      ? 'bg-gold text-charcoal'
                      : 'border border-charcoal-light hover:bg-charcoal-light'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-charcoal-light rounded-lg hover:bg-charcoal-light transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {i18n.language === 'ar' ? '←' : '→'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
