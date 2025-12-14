import { useTranslation } from 'react-i18next';

const trustItems = [
  {
    id: 'authenticity',
    icon: (
      <svg className="w-12 h-12 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: { ar: 'ضمان الأصالة', en: 'Authenticity Verified' },
    description: { ar: 'جميع المنتجات أصلية 100%', en: '100% Authentic Products' }
  },
  {
    id: 'secure',
    icon: (
      <svg className="w-12 h-12 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: { ar: 'دفع آمن', en: 'Secure Payments' },
    description: { ar: 'معاملات محمية ومشفرة', en: 'Protected & Encrypted' }
  },
  {
    id: 'shipping',
    icon: (
      <svg className="w-12 h-12 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: { ar: 'شحن سريع', en: 'Fast Shipping' },
    description: { ar: 'توصيل خلال 2-7 أيام', en: 'Delivery in 2-7 Days' }
  },
  {
    id: 'returns',
    icon: (
      <svg className="w-12 h-12 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: { ar: 'إرجاع سهل', en: 'Easy Returns' },
    description: { ar: 'استرجاع خلال 14 يوم', en: '14-Day Return Policy' }
  }
];

export default function TrustBadges() {
  const { i18n } = useTranslation();
  const lang = i18n.language as 'ar' | 'en';

  return (
    <section className="bg-sand py-4 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid grid-cols-4 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trustItems.map((item) => (
            <div key={item.id} className="text-center">
              <div className="flex justify-center mb-4">
                {item.icon}
              </div>
              <h3 className="text-lg font-bold text-charcoal mb-2">
                {item.title[lang]}
              </h3>
              <p className="text-sm text-taupe">
                {item.description[lang]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
