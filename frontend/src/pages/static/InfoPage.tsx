import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { FooterPageKey, LocaleCode } from '../../types/staticPages';
import { getDefaultFooterPage } from '../../content/footerPages';
import { fetchPublishedFooterPage } from '../../services/footerPages';
import { resolveImageUrl } from '../../utils/image';
import { PLACEHOLDER_PERFUME } from '../../utils/staticAssets';

export default function InfoPage() {
  const { t, i18n } = useTranslation();
  const loc = useLocation();
  const lang = (i18n.language === 'ar' ? 'ar' : 'en') as LocaleCode;

  // نستخرج الـ slug من المسار: نحافظ على المسارات الفرعية المخصصة
  const { slug, canonicalPath } = useMemo(() => {
    const parts = loc.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
    const first = parts[0] || 'help';
    const second = parts[1];

    const joined = second && first === 'help'
      ? (`help-${second}` as FooterPageKey)
      : (first as FooterPageKey);

    const allowed: FooterPageKey[] = [
      'about','authenticity','how-it-works','help',
      'help-buying-preowned','help-bidding-guide',
      'shipping','returns','privacy','terms','contact'
    ];

    const resolved: FooterPageKey = allowed.includes(joined) ? joined : 'help';
    const canonical = `/${parts.join('/') || resolved}`;

    return { slug: resolved, canonicalPath: canonical };
  }, [loc.pathname]);

  const [page, setPage] = useState(getDefaultFooterPage(slug));

  useEffect(() => {
    let active = true;
    setPage(getDefaultFooterPage(slug));
    fetchPublishedFooterPage(slug)
      .then((response) => {
        if (!active) return;
        if (response?.content) {
          setPage(response.content);
        }
      })
      .catch(() => {
        /* fallback already set */
      });
    return () => {
      active = false;
    };
  }, [slug]);
  const heroTitle = page?.heroTitle?.[lang] || t(`pages.${slug}.title`);
  const heroSubtitle = page?.heroSubtitle?.[lang] || t(`pages.${slug}.desc`);
  const seoDesc = page?.seoDescription?.[lang] || heroSubtitle;
  const sections = page?.sections ?? [];
  const highlights = sections[0]?.highlights ?? [];
  const heroImage = page?.heroImage;
  const resolvedHeroImage = resolveImageUrl(heroImage) || PLACEHOLDER_PERFUME;

  return (
    <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-sand py-12">
      <Helmet>
        <title>{heroTitle} | {t('common.siteName')}</title>
        <meta name="description" content={seoDesc} />
        <link rel="canonical" href={`${window.location.origin}${canonicalPath}`} />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 space-y-10">
        <section className="bg-gradient-to-br from-charcoal to-charcoal/90 text-ivory rounded-3xl p-6 sm:p-8 shadow-soft-lg relative overflow-hidden">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold/80 bg-white/5 rounded-full px-4 py-1.5 mb-4">
                <span className="text-lg" aria-hidden>{page?.icon ?? '📄'}</span>
                {page?.label?.[lang] || heroTitle}
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">{heroTitle}</h1>
              <div
                className="text-sm sm:text-base text-ivory/80 leading-relaxed prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(heroSubtitle) }}
              />

              {highlights.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {highlights.slice(0, 4).map((chip, idx) => (
                    <span
                      key={`highlight-${chip[lang]}-${idx}`}
                      className="bg-white/10 border border-white/15 text-xs sm:text-sm px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur"
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold" />
                      {chip[lang]}
                    </span>
                  ))}
                </div>
              )}

              {page?.lastUpdated && (
                <p className="text-xs text-ivory/60 mt-6">
                  {t('pages.lastUpdated', 'آخر تحديث')}: {new Date(page.lastUpdated).toLocaleDateString(i18n.language)}
                </p>
              )}
            </div>

            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-xl border border-white/15 bg-white/5 backdrop-blur">
                <img
                  src={resolvedHeroImage}
                  alt={heroTitle}
                  className="w-full h-64 object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = PLACEHOLDER_PERFUME;
                  }}
                />
              </div>
              <div className="absolute -bottom-4 inset-x-8 bg-white text-charcoal rounded-2xl shadow-soft flex items-center gap-3 px-4 py-3">
                <span className="text-gold text-2xl">✦</span>
                <div>
                  <p className="text-xs text-charcoal/70">{t('pages.curatedBy', 'بإشراف فريق الخبراء')}</p>
                  <p className="text-sm font-semibold">{t('pages.curatedCopy', 'تفاصيل دقيقة لكل قسم')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-8">
          {sections.map((section) => (
            <article
              key={section.id}
              className="bg-white/90 rounded-3xl shadow-soft-lg p-6 sm:p-8 border border-sand/70"
            >
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    {page?.label?.[lang]}
                  </div>
                  <h2 className="text-2xl font-bold text-charcoal mb-3">{section.title[lang]}</h2>
                  <div
                    className="text-charcoal/80 leading-relaxed space-y-4 prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.body[lang] ?? '') }}
                  />

                  {(section.highlights ?? []).length > 0 && (
                    <div className="mt-6 grid sm:grid-cols-2 gap-3">
                      {(section.highlights ?? []).map((highlight, idx) => (
                        <div
                          key={`${section.id}-hl-${idx}`}
                          className="flex items-start gap-3 bg-sand/50 rounded-2xl px-4 py-3 border border-sand/70"
                        >
                          <span className="text-gold text-xl" aria-hidden>
                            ●
                          </span>
                          <p className="text-sm text-charcoal/90">{highlight[lang]}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {section.image && (
                  <div className="lg:w-64">
                    <div className="rounded-2xl overflow-hidden shadow-soft border border-sand/80 h-full">
                      <img
                        src={resolveImageUrl(section.image) || PLACEHOLDER_PERFUME}
                        alt={section.title[lang]}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = PLACEHOLDER_PERFUME;
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
