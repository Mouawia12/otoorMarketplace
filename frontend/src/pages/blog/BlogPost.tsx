import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useUIStore } from '../../store/uiStore';
import { extractToc } from '../../services/blogService';
import { BLOG_PLACEHOLDER } from '../../utils/staticAssets';
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

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const foundPost = await fetchPost(slug, language);
      if (!foundPost) {
        navigate('/blog');
        return;
      }
      setPost(foundPost);
      setToc(extractToc(foundPost.html || ''));

      const all = await fetchPosts(language, 'published');
      const related = all
        .filter((p) => p.slug !== slug)
        .map((p) => ({
          ...p,
          score:
            (p.category === foundPost.category ? 3 : 0) +
            p.tags.filter((tg) => foundPost.tags.includes(tg)).length,
        }))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        })
        .slice(0, 3)
        .map(({ score, ...rest }) => rest);
      setRelatedPosts(related);
      setLoading(false);
    };
    load();
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

  const pageTitle = post.title;
  const pageDesc = post.description;
  const canonicalUrl = `${window.location.origin}/blog/${post.slug}`;
  const imageUrl = (() => {
    if (!post.cover) return `${window.location.origin}/logo.png`;
    if (post.cover.startsWith('http')) return post.cover;
    if (post.cover.startsWith('data:') || post.cover.startsWith('blob:')) return post.cover;
    return `${window.location.origin}${post.cover}`;
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
        {post.tags.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

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

      <div className="min-h-screen bg-sand py-12 sm:py-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumbs */}
          <nav className="text-sm text-taupe mb-6 sm:mb-8 flex items-center gap-2">
            <Link to="/" className="hover:text-gold">{t('nav.home')}</Link>
            <span>{i18n.language === 'ar' ? '←' : '→'}</span>
            <Link to="/blog" className="hover:text-gold">{t('blog.title')}</Link>
            <span>{i18n.language === 'ar' ? '←' : '→'}</span>
            <span className="text-charcoal">{post.title}</span>
          </nav>

          <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
            {/* Main Content */}
            <article className="lg:col-span-8">
              {/* Header */}
              <header className="mb-8">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-taupe mb-3 sm:mb-4">
                  <span className="bg-gold text-charcoal px-3 py-1 rounded-full font-semibold">
                    {post.category}
                  </span>
                  <span>{new Date(post.date).toLocaleDateString(
                    i18n.language === 'ar' ? 'ar-SA' : 'en-US',
                    { year: 'numeric', month: 'long', day: 'numeric' }
                  )}</span>
                  <span>•</span>
                  <span>{post.readingTime || 2} {t('blog.minRead')}</span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal mb-3 sm:mb-4 leading-tight">
                  {post.title}
                </h1>

                <p className="text-base sm:text-lg text-taupe mb-5 sm:mb-6">
                  {post.description}
                </p>

                <div className="flex items-center gap-3 text-sm">
                  <span className="text-taupe">{t('blog.by')} {post.author}</span>
                </div>
              </header>

              {/* Cover Image */}
              <div className="aspect-video rounded-luxury overflow-hidden mb-6 sm:mb-8 bg-ivory">
                <img
                  src={post.cover}
                  alt={post.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = BLOG_PLACEHOLDER;
                  }}
                />
              </div>

              {/* Content */}
              <div
                className={`prose prose-base sm:prose-lg max-w-none mb-10 sm:mb-12 ${i18n.language === 'ar' ? 'prose-rtl' : ''}`}
                dangerouslySetInnerHTML={{ __html: post.html || '' }}
                style={{
                  direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
                }}
              />

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-6 sm:mb-8">
                  <span className="text-taupe font-semibold">{t('blog.tags')}:</span>
                  {post.tags.map(tag => (
                    <Link
                      key={tag}
                      to={`/blog/tag/${tag}`}
                      className="px-3 py-1 bg-ivory text-taupe rounded-full text-xs sm:text-sm hover:bg-gold hover:text-charcoal transition"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Share Buttons */}
              <div className="border-t border-charcoal-light pt-6 sm:pt-8">
                <p className="text-taupe font-semibold mb-4">{t('blog.share')}:</p>
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  <button
                    onClick={() => handleShare('copy')}
                    className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-ivory hover:bg-charcoal-light transition rounded-lg flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {copySuccess ? t('blog.copied') : t('blog.copyLink')}
                  </button>

                  <button
                    onClick={() => handleShare('whatsapp')}
                    className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-green-500 hover:bg-green-600 text-white transition rounded-lg flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.05 2C6.53 2 2 6.25 2 11.72c0 1.7.45 3.3 1.32 4.75L2 22l5.43-1.42a9.95 9.95 0 0 0 4.62 1.14c5.52 0 10.05-4.25 10.05-9.72C22.1 6.25 17.57 2 12.05 2Zm0 17.26c-1.43 0-2.82-.38-4.05-1.12l-.29-.17-3.32.86.88-3.04-.19-.3a7.42 7.42 0 0 1-1.16-3.97c0-4.1 3.4-7.42 7.74-7.42 4.25 0 7.71 3.32 7.71 7.42 0 4.1-3.46 7.42-7.71 7.42Zm4.02-5.5c-.22-.11-1.35-.67-1.57-.75-.22-.08-.38-.11-.54.11-.16.22-.61.75-.75.91-.14.16-.28.18-.52.06-.24-.11-1-.37-1.9-1.21-.7-.62-1.18-1.38-1.32-1.62-.14-.24-.02-.37.1-.49.1-.1.24-.26.34-.39.12-.14.14-.24.22-.4.08-.16.04-.3 0-.42-.04-.12-.52-1.25-.72-1.72-.18-.45-.37-.39-.52-.4-.14-.01-.3-.02-.46-.02-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.03 0 1.2.87 2.36 1 .25.12.16 1.7 2.6 4.1 3.66.58.26 1.02.41 1.38.53.58.18 1.1.17 1.52.1.47-.07 1.43-.55 1.64-1.1.22-.55.22-1.02.14-1.12-.06-.1-.22-.16-.45-.28Z" />
                    </svg>
                    {t('blog.whatsapp')}
                  </button>

                  <button
                    onClick={() => handleShare('twitter')}
                    className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-black text-white hover:bg-charcoal transition rounded-lg flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M4 3h4.3l4 5.4L17.7 3H21l-6.6 7.4L21.5 21H17.2l-4.4-5.8L7.9 21H3.5l6.9-7.7L4 3Zm2.3 1.4 9.5 12.7h1.1L7.4 4.4H6.3Z" />
                    </svg>
                    {t('blog.twitterX')}
                  </button>
                </div>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="lg:col-span-4">
              {/* TOC */}
              {toc.length > 0 && (
                <div className="bg-ivory rounded-luxury p-5 sm:p-6 mb-8 sticky top-24">
                  <h3 className="text-lg sm:text-xl font-bold text-charcoal mb-3 sm:mb-4">
                    {t('blog.toc')}
                  </h3>
                  <nav>
                    <ul className="space-y-2 text-sm sm:text-base">
                      {toc.map(item => (
                        <li
                          key={item.id}
                          className={item.level === 3 ? 'ms-4' : ''}
                        >
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
            </aside>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <section className="mt-14 sm:mt-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-charcoal mb-6 sm:mb-8">
                {t('blog.related')}
              </h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                {relatedPosts.map(related => (
                  <Link
                    key={related.slug}
                    to={`/blog/${related.slug}`}
                    className="group bg-ivory rounded-luxury overflow-hidden shadow-sm hover:shadow-luxury transition"
                  >
                    <div className="aspect-video overflow-hidden bg-sand">
                      <img
                        src={related.cover}
                        alt={related.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                        e.currentTarget.src = BLOG_PLACEHOLDER;
                        }}
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-charcoal mb-2 group-hover:text-gold transition line-clamp-2 text-base sm:text-lg">
                        {related.title}
                      </h3>
                      <p className="text-sm text-taupe line-clamp-2">
                        {related.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Back to Blog */}
          <div className="mt-10 sm:mt-12 text-center">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gold text-charcoal rounded-luxury hover:bg-gold-hover transition font-semibold text-sm sm:text-base"
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
