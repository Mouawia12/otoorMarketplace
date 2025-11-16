import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useUIStore } from '../../store/uiStore';
import { getPostBySlug, getRelated, extractToc, type BlogPost as BlogPostType } from '../../services/blogService';
import { BLOG_PLACEHOLDER } from '../../utils/staticAssets';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const foundPost = getPostBySlug(slug, language);
    if (!foundPost) {
      navigate('/blog');
      return;
    }

    setPost(foundPost);
    setRelatedPosts(getRelated(slug, language, 3));
    setToc(extractToc(foundPost.html));
  }, [slug, language, navigate]);

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
  const imageUrl = post.cover.startsWith('http') ? post.cover : `${window.location.origin}${post.cover}`;

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

      <div className="min-h-screen bg-sand py-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumbs */}
          <nav className="text-sm text-taupe mb-8 flex items-center gap-2">
            <Link to="/" className="hover:text-gold">{t('nav.home')}</Link>
            <span>{i18n.language === 'ar' ? '←' : '→'}</span>
            <Link to="/blog" className="hover:text-gold">{t('blog.title')}</Link>
            <span>{i18n.language === 'ar' ? '←' : '→'}</span>
            <span className="text-charcoal">{post.title}</span>
          </nav>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Main Content */}
            <article className="lg:col-span-8">
              {/* Header */}
              <header className="mb-8">
                <div className="flex flex-wrap items-center gap-2 text-sm text-taupe mb-4">
                  <span className="bg-gold text-charcoal px-3 py-1 rounded-full font-semibold">
                    {post.category}
                  </span>
                  <span>{new Date(post.date).toLocaleDateString(
                    i18n.language === 'ar' ? 'ar-SA' : 'en-US',
                    { year: 'numeric', month: 'long', day: 'numeric' }
                  )}</span>
                  <span>•</span>
                  <span>{post.readingTime} {t('blog.minRead')}</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-charcoal mb-4">
                  {post.title}
                </h1>

                <p className="text-xl text-taupe mb-6">
                  {post.description}
                </p>

                <div className="flex items-center gap-4 text-sm">
                  <span className="text-taupe">{t('blog.by')} {post.author}</span>
                </div>
              </header>

              {/* Cover Image */}
              <div className="aspect-video rounded-luxury overflow-hidden mb-8 bg-ivory">
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
                className={`prose prose-lg max-w-none mb-12 ${i18n.language === 'ar' ? 'prose-rtl' : ''}`}
                dangerouslySetInnerHTML={{ __html: post.html }}
                style={{
                  direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
                }}
              />

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-8">
                  <span className="text-taupe font-semibold">{t('blog.tags')}:</span>
                  {post.tags.map(tag => (
                    <Link
                      key={tag}
                      to={`/blog/tag/${tag}`}
                      className="px-3 py-1 bg-ivory text-taupe rounded-full text-sm hover:bg-gold hover:text-charcoal transition"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Share Buttons */}
              <div className="border-t border-charcoal-light pt-8">
                <p className="text-taupe font-semibold mb-4">{t('blog.share')}:</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleShare('copy')}
                    className="px-6 py-3 bg-ivory hover:bg-charcoal-light transition rounded-lg flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {copySuccess ? t('blog.copied') : t('blog.copyLink')}
                  </button>

                  <button
                    onClick={() => handleShare('whatsapp')}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white transition rounded-lg"
                  >
                    WhatsApp
                  </button>

                  <button
                    onClick={() => handleShare('twitter')}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white transition rounded-lg"
                  >
                    Twitter
                  </button>
                </div>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="lg:col-span-4">
              {/* TOC */}
              {toc.length > 0 && (
                <div className="bg-ivory rounded-luxury p-6 mb-8 sticky top-24">
                  <h3 className="text-xl font-bold text-charcoal mb-4">
                    {t('blog.toc')}
                  </h3>
                  <nav>
                    <ul className="space-y-2">
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
            <section className="mt-16">
              <h2 className="text-3xl font-bold text-charcoal mb-8">
                {t('blog.related')}
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
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
                      <h3 className="font-bold text-charcoal mb-2 group-hover:text-gold transition line-clamp-2">
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
          <div className="mt-12 text-center">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-charcoal rounded-luxury hover:bg-gold-hover transition font-semibold"
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
