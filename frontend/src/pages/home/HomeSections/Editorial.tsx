import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const guides = [
  {
    id: 'preowned',
    title: { ar: 'دليل شراء العطور المستعملة', en: 'How to Buy Pre-Owned Safely' },
    description: { ar: 'تعرف على أفضل الممارسات لشراء العطور المستعملة بأمان', en: 'Learn best practices for buying pre-owned perfumes safely' },
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80',
    link: '/help/buying-preowned'
  },
  {
    id: 'bidding',
    title: { ar: 'دليل المزايدة في المزادات', en: 'Guide to Bidding in Auctions' },
    description: { ar: 'استراتيجيات وإرشادات للفوز في المزادات الحية', en: 'Strategies and tips for winning live auctions' },
    image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&q=80',
    link: '/help/bidding-guide'
  }
];

export default function Editorial() {
  const { i18n } = useTranslation();
  const lang = i18n.language as 'ar' | 'en';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {guides.map((guide) => (
          <Link
            key={guide.id}
            to={guide.link}
            className="group relative overflow-hidden rounded-lg shadow-luxury hover:shadow-gold transition-all"
          >
            <div className="aspect-[16/9] overflow-hidden">
              <img
                src={guide.image}
                alt={guide.title[lang]}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h3 className="text-xl md:text-2xl font-bold text-ivory mb-2">
                {guide.title[lang]}
              </h3>
              <p className="text-sm text-sand">
                {guide.description[lang]}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
