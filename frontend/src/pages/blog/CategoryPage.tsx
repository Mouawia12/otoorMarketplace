import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useUIStore } from '../../store/uiStore';
import { BLOG_PLACEHOLDER } from '../../utils/staticAssets';
import { useEffect, useState } from 'react';
import { BlogPost, fetchPosts } from '../../services/blogApi';

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!category) return;
      setLoading(true);
      try {
        const data = await fetchPosts(language, 'published');
        setPosts(data.filter((p) => p.category.toLowerCase() === category.toLowerCase()));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [language, category]);
  
  const pageTitle = `${t('blog.category')}: ${category}`;
  const canonicalUrl = `${window.location.origin}/blog/category/${category}`;

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
        "name": category,
        "item": canonicalUrl
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle} | {t('common.siteName')}</title>
        <meta name="description" content={`${t('blog.browsing')} ${category}`} />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="ar" href={`${window.location.origin}/blog/category/${category}?lang=ar`} />
        <link rel="alternate" hrefLang="en" href={`${window.location.origin}/blog/category/${category}?lang=en`} />
        <link rel="alternate" hrefLang="x-default" href={`${window.location.origin}/blog/category/${category}`} />
        
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
            <span className="text-charcoal">{category}</span>
          </nav>

          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-charcoal mb-4">
              {t('blog.category')}: {category}
            </h1>
            <p className="text-lg text-taupe">
              {posts.length} {t('blog.articlesFound')}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <p className="text-xl text-taupe">{t('common.loading')}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl text-taupe mb-6">{t('blog.noPosts')}</p>
              <Link to="/blog" className="text-gold hover:underline">
                {t('blog.back')}
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map(post => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="group bg-ivory rounded-luxury overflow-hidden shadow-sm hover:shadow-luxury transition"
                >
                  <div className="aspect-video overflow-hidden bg-sand">
                    <img
                      src={post.cover}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = BLOG_PLACEHOLDER;
                      }}
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-sm text-taupe mb-3">
                      <span>{new Date(post.date).toLocaleDateString(
                        i18n.language === 'ar' ? 'ar-SA' : 'en-US',
                        { year: 'numeric', month: 'long', day: 'numeric' }
                      )}</span>
                      <span>•</span>
                      <span>{post.readingTime || 2} {t('blog.minRead')}</span>
                    </div>
                    <h3 className="text-xl font-bold text-charcoal mb-2 group-hover:text-gold transition line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-taupe line-clamp-3">
                      {post.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
