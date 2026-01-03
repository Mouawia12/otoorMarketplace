import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useUIStore } from '../../store/uiStore';
import { extractToc } from '../../services/blogService';
import { BLOG_PLACEHOLDER } from '../../utils/staticAssets';
import { resolveImageUrl } from '../../utils/image';
import { BlogPost as BlogPostType, fetchPost, fetchPosts } from '../../services/blogApi';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contentLanguage, setContentLanguage] = useState<'ar' | 'en'>(language);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const fetchForLang = (lang: 'ar' | 'en') => fetchPost(slug, lang);
      try {
        let langUsed: 'ar' | 'en' = language;
        let foundPost = await fetchForLang(language);
        if (!foundPost) {
          const fallbackLang = language === 'ar' ? 'en' : 'ar';
          const fallbackPost = await fetchForLang(fallbackLang);
          if (fallbackPost) {
            foundPost = fallbackPost;
            langUsed = fallbackLang;
          }
        }

        if (!foundPost) {
          navigate('/blog');
          return;
        }

        const all = await fetchPosts(langUsed, 'published');
        const related = all
          .filter((p) => p.slug !== slug)
          .map((p) => ({
            ...p,
            score:
              (p.category === foundPost!.category ? 3 : 0) +
              p.tags.filter((tg) => foundPost!.tags.includes(tg)).length,
          }))
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          })
          .slice(0, 3)
          .map(({ score: _score, ...rest }) => rest);

        if (cancelled) return;
        setPost(foundPost);
        setContentLanguage(langUsed);
        setToc(extractToc(foundPost.html || ''));
        setRelatedPosts(related);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug, language, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center">
        <p className="text-charcoal-light">{t('common.loading')}</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-charcoal mb-4">{t('blog.notFound')}</h2>
          <Link to="/blog" className="text-gold hover:underline">
            {t('blog.back')}
          </Link>
        </div>
      </div>
    );
  }

  const buildCoverSrc = (src?: string | null) => {
    if (!src) return BLOG_PLACEHOLDER;
    if (src.startsWith('data:') || src.startsWith('blob:')) return src;
    return resolveImageUrl(src, { disableOptimization: true }) || BLOG_PLACEHOLDER;
  };

  const coverSrc = buildCoverSrc(post.cover);

  const pageTitle = post.title;
  const pageDesc = post.description;
  const canonicalUrl = `${window.location.origin}/blog/${post.slug}`;
  const imageUrl = (() => {
    if (!coverSrc) return `${window.location.origin}/logo.png`;
    if (coverSrc.startsWith('http')) return coverSrc;
    if (coverSrc.startsWith('data:') || coverSrc.startsWith('blob:')) return coverSrc;
    const prefix = coverSrc.startsWith('/') ? '' : '/';
    return `${window.location.origin}${prefix}${coverSrc}`;
  })();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description,
    "image": imageUrl,
    "author": {
      "@type": "Person",
      "name": post.author
    },
    "publisher": {
      "@type": "Organization",
      "name": t('common.siteName'),
      "logo": {
        "@type": "ImageObject",
        "url": `${window.location.origin}/logo.png`
      }
    },
    "datePublished": post.date,
    "dateModified": post.date,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": t('nav.home'),
        "item": window.location.origin
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": t('blog.title'),
        "item": `${window.location.origin}/blog`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.title,
        "item": canonicalUrl
      }
    ]
  };

  const handleShare = (platform: string) => {
    const url = encodeURIComponent(canonicalUrl);
    const text = encodeURIComponent(post.title);

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(canonicalUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        break;
    }
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle} | {t('common.siteName')}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="ar" href={`${window.location.origin}/blog/${post.slug}?lang=ar`} />
        <link rel="alternate" hrefLang="en" href={`${window.location.origin}/blog/${post.slug}?lang=en`} />
        <link rel="alternate" hrefLang="x-default" href={`${window.location.origin}/blog/${post.slug}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={imageUrl} />
        <meta property="article:published_time" content={post.date} />
        <meta property="article:author" content={post.author} />
        <meta property="article:section" content={post.category} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <meta name="twitter:image" content={imageUrl} />

        {/* JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-ivory via-sand/60 to-sand py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 lg:px-0 relative">
          <div className="absolute inset-0 -z-10 opacity-40 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.7),_transparent_60%)]" />

          {/* Breadcrumbs */}
          <nav className="text-sm text-taupe mb-6 sm:mb-10 flex items-center gap-2">
            <Link to="/" className="hover:text-gold transition">{t('nav.home')}</Link>
            <span className="text-charcoal/50">{i18n.language === 'ar' ? '←' : '→'}</span>
            <Link to="/blog" className="hover:text-gold transition">{t('blog.title')}</Link>
            <span className="text-charcoal/50">{i18n.language === 'ar' ? '←' : '→'}</span>
            <span className="text-charcoal font-semibold line-clamp-1">{post.title}</span>
          </nav>

          {contentLanguage !== language && (
            <div className="mb-6 rounded-2xl border border-gold/40 bg-gold/10 text-sm text-charcoal px-4 py-3">
              {language === 'en'
                ? t('blog.languageFallbackEn', 'This article is only available in Arabic for now. Showing the Arabic version.')
                : t('blog.languageFallbackAr', 'هذه التدوينة متاحة بالإنجليزية فقط حالياً. نعرض النسخة الإنجليزية.')}
            </div>
          )}

          <div className="relative grid lg:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)] gap-6 sm:gap-8">
            {/* Main Content */}
            <article className="bg-white/95 border border-ivory/70 rounded-[32px] shadow-[0_25px_80px_rgba(15,23,42,0.08)] p-6 sm:p-10 backdrop-blur">
              <header className="mb-8 sm:mb-10 space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-taupe">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 text-gold font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                    {post.category}
                  </span>
                  <span className="text-charcoal/70">
                    {new Date(post.date).toLocaleDateString(
                      i18n.language === 'ar' ? 'ar-SA' : 'en-US',
                      { year: 'numeric', month: 'long', day: 'numeric' }
                    )}
                  </span>
                  <span className="text-charcoal/30">•</span>
                  <span className="text-charcoal/70">{post.readingTime || 2} {t('blog.minRead')}</span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-charcoal leading-tight">
                  {post.title}
                </h1>

                <p className="text-lg sm:text-xl text-charcoal/75 leading-relaxed max-w-3xl break-words">
                  {post.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-sm text-taupe">
                  <span className="font-medium text-charcoal">{t('blog.by')} {post.author}</span>
                </div>
              </header>

              <div className="rounded-[28px] overflow-hidden mb-10 bg-ivory min-h-[220px] flex items-center justify-center">
                <img
                  src={coverSrc}
                  alt={post.title}
                  loading="lazy"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = BLOG_PLACEHOLDER;
                  }}
                />
              </div>

              <div
                className={`prose prose-base sm:prose-lg prose-headings:text-charcoal prose-a:text-gold prose-strong:text-charcoal break-words max-w-none mb-8 sm:mb-10 ${i18n.language === 'ar' ? 'prose-rtl' : ''}`}
                dangerouslySetInnerHTML={{ __html: post.html || '' }}
                style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}
              />

              <div className="space-y-6">
                <div className="bg-ivory/80 border border-ivory/60 rounded-2xl p-4 sm:p-6">
                  <p className="text-taupe font-semibold mb-3">{t('blog.share')}</p>
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    <button
                      onClick={() => handleShare('copy')}
                      className="px-4 py-2 sm:px-5 sm:py-3 text-sm bg-white rounded-xl border border-sand hover:border-gold transition flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {copySuccess ? t('blog.copied') : t('blog.copyLink')}
                    </button>
                    <button
                      onClick={() => handleShare('whatsapp')}
                      className="px-4 py-2 sm:px-5 sm:py-3 text-sm rounded-xl bg-green-500 text-white hover:bg-green-600 transition flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.05 2C6.53 2 2 6.25 2 11.72c0 1.7.45 3.3 1.32 4.75L2 22l5.43-1.42a9.95 9.95 0 0 0 4.62 1.14c5.52 0 10.05-4.25 10.05-9.72C22.1 6.25 17.57 2 12.05 2Zm0 17.26c-1.43 0-2.82-.38-4.05-1.12l-.29-.17-3.32.86.88-3.04-.19-.3a7.42 7.42 0 0 1-1.16-3.97c0-4.1 3.4-7.42 7.74-7.42 4.25 0 7.71 3.32 7.71 7.42 0 4.1-3.46 7.42-7.71 7.42Zm4.02-5.5c-.22-.11-1.35-.67-1.57-.75-.22-.08-.38-.11-.54.11-.16.22-.61.75-.75.91-.14.16-.28.18-.52.06-.24-.11-1-.37-1.9-1.21-.7-.62-1.18-1.38-1.32-1.62-.14-.24-.02-.37.1-.49.1-.1.24-.26.34-.39.12-.14.14-.24.22-.4.08-.16.04-.3 0-.42-.04-.12-.52-1.25-.72-1.72-.18-.45-.37-.39-.52-.4-.14-.01-.3-.02-.46-.02-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.03 0 1.2.87 2.36 1 .25.12.16 1.7 2.6 4.1 3.66.58.26 1.02.41 1.38.53.58.18 1.1.17 1.52.1.47-.07 1.43-.55 1.64-1.1.22-.55.22-1.02.14-1.12-.06-.1-.22-.16-.45-.28Z" />
                      </svg>
                      {t('blog.whatsapp')}
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="px-4 py-2 sm:px-5 sm:py-3 text-sm rounded-xl bg-black text-white hover:bg-charcoal transition flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M4 3h4.3l4 5.4L17.7 3H21l-6.6 7.4L21.5 21H17.2l-4.4-5.8L7.9 21H3.5l6.9-7.7L4 3Zm2.3 1.4 9.5 12.7h1.1L7.4 4.4H6.3Z" />
                      </svg>
                      {t('blog.twitterX')}
                    </button>
                  </div>
                </div>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="space-y-6 lg:sticky lg:top-24 h-max">
              {toc.length > 0 && (
                <div className="bg-white/95 rounded-[28px] border border-ivory/70 shadow-lg p-5 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-charcoal mb-4">
                    {t('blog.toc')}
                  </h3>
                  <nav>
                    <ul className="space-y-2 text-sm sm:text-base">
                      {toc.map(item => (
                        <li key={item.id} className={item.level === 3 ? (i18n.language === 'ar' ? 'me-4' : 'ms-4') : ''}>
                          <a
                            href={`#${item.id}`}
                            className="text-taupe hover:text-gold transition block py-1"
                          >
                            {item.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              )}

              <div className="bg-gradient-to-br from-gold/15 to-white rounded-[28px] border border-gold/30 p-6 shadow-lg">
                <p className="text-charcoal font-semibold mb-2">{t('blog.keepReading', 'استكشف المزيد من المقالات')}</p>
                <p className="text-sm text-taupe mb-4">
                  {t('blog.keepReadingDesc', 'نحدث المدونة باستمرار بقصص ونصائح حول عالم العطور.')} 
                </p>
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gold hover:text-charcoal transition"
                >
                  {t('blog.viewAll', 'عرض جميع التدوينات')}
                  <span>{i18n.language === 'ar' ? '←' : '→'}</span>
                </Link>
              </div>
            </aside>
          </div>

          {relatedPosts.length > 0 && (
            <section className="mt-16 sm:mt-20">
              <div className="bg-white/90 rounded-[32px] border border-ivory/60 shadow-xl p-6 sm:pt-8 sm:px-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl sm:text-3xl font-bold text-charcoal">{t('blog.related')}</h2>
                  <Link to="/blog" className="text-sm text-gold hover:text-charcoal transition">
                    {t('blog.viewAll', 'عرض جميع التدوينات')}
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {relatedPosts.map(related => {
                    const relatedCover = buildCoverSrc(related.cover);
                    return (
                      <Link
                        key={related.slug}
                        to={`/blog/${related.slug}`}
                        className="group rounded-2xl border border-ivory/60 overflow-hidden bg-ivory/60 hover:shadow-xl transition"
                      >
                        <div className="aspect-video overflow-hidden bg-sand flex items-center justify-center">
                          <img
                            src={relatedCover}
                            alt={related.title}
                            loading="lazy"
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = BLOG_PLACEHOLDER;
                            }}
                          />
                        </div>
                        <div className="p-4">
                          <p className="text-xs text-taupe mb-2">
                            {new Date(related.date).toLocaleDateString(
                              i18n.language === 'ar' ? 'ar-SA' : 'en-US',
                              { year: 'numeric', month: 'short', day: 'numeric' }
                            )}
                          </p>
                          <h3 className="font-semibold text-charcoal mb-2 line-clamp-2 group-hover:text-gold transition">
                            {related.title}
                          </h3>
                          <p className="text-sm text-taupe line-clamp-2">{related.description}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          <div className="mt-12 sm:mt-16 text-center">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gold text-charcoal rounded-full hover:bg-gold-hover transition font-semibold text-sm sm:text-base shadow-lg"
            >
              <span>{i18n.language === 'ar' ? '→' : '←'}</span>
              {t('blog.back')}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
