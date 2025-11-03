import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

type PageKey =
  | 'about'
  | 'authenticity'
  | 'how-it-works'
  | 'help'
  | 'shipping'
  | 'returns'
  | 'privacy'
  | 'terms'
  | 'contact';

export default function InfoPage() {
  const { t, i18n } = useTranslation();
  const loc = useLocation();

  // نستخرج الـ slug من المسار: /about → "about"
  const slug = useMemo<PageKey>(() => {
    const s = loc.pathname.replace(/^\/+/, ''); // remove leading /
    // لو فيه path فرعي مثل /help/faq نأخذ أول جزء فقط
    const first = s.split('/')[0] as PageKey;
    return ([
      'about','authenticity','how-it-works','help',
      'shipping','returns','privacy','terms','contact'
    ] as PageKey[]).includes(first) ? first : 'help';
  }, [loc.pathname]);

  // عناوين وأوصاف SEO من الترجمة
  const title = t(`pages.${slug}.title`);
  const desc  = t(`pages.${slug}.desc`);

  return (
    <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-sand py-12">
      <Helmet>
        <title>{title} | {t('common.siteName')}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={`${window.location.origin}/${slug}`} />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <h1 className="text-3xl md:text-4xl font-extrabold text-charcoal mb-4">{title}</h1>
        <p className="text-taupe mb-8">{desc}</p>

        {/* محتوى بسيط قابل للتخصيص لاحقًا */}
        <div className="bg-ivory rounded-luxury shadow-sm p-5 md:p-6 leading-8 text-charcoal">
          {/* يمكنك لاحقًا استبدال هذا المحتوى بـ CMS أو مكوّنات أغنى */}
          <div className="prose prose-invert max-w-none">
            <p>{t(`pages.${slug}.body.p1`)}</p>
            <p>{t(`pages.${slug}.body.p2`)}</p>
            <ul className="list-disc pe-6 my-4">
              <li>{t(`pages.${slug}.body.l1`)}</li>
              <li>{t(`pages.${slug}.body.l2`)}</li>
              <li>{t(`pages.${slug}.body.l3`)}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
