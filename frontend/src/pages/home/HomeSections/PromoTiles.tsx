import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const promoTiles = [
  {
    id: 'new',
    title: { ar: 'وصل حديثاً', en: 'New Arrivals' },
    description: { ar: 'أحدث العطور الفاخرة', en: 'Latest Luxury Fragrances' },
    link: '/new',
    bgColor: 'bg-gold',
    textColor: 'text-charcoal',
  },
  {
    id: 'used',
    title: { ar: 'عطور مستعملة', en: 'Pre-Owned' },
    description: { ar: 'أسعار لا تقاوم', en: 'Unbeatable Prices' },
    link: '/used',
    bgColor: 'bg-charcoal-light',
    textColor: 'text-ivory',
  },
  {
    id: 'auctions',
    title: { ar: 'مزادات حية', en: 'Live Auctions' },
    description: { ar: 'زايد واربح', en: 'Bid & Win' },
    link: '/auctions',
    bgColor: 'bg-sand',
    textColor: 'text-charcoal',
  },
];

export default function PromoTiles() {
  const { i18n } = useTranslation();
  const lang = (i18n.language as 'ar' | 'en') || 'ar';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-12">
      {/* الجوال: أزرار في الوسط مع التفاف عند ضيق العرض */}
      <div className="sm:hidden">
        <div className="flex flex-wrap justify-center gap-2">
          {promoTiles.map((tile) => (
            <Link
              key={tile.id}
              to={tile.link}
              aria-label={tile.title[lang]}
              className={[
                tile.bgColor,
                tile.textColor,
                'inline-flex items-center justify-center',
                'px-4 h-11 rounded-luxury font-semibold',
                'text-sm whitespace-nowrap w-auto max-w-none',
                'shadow-sm hover:shadow transition active:scale-95',
              ].join(' ')}
            >
              {tile.title[lang]}
            </Link>
          ))}
        </div>
      </div>

      {/* تابلت/ديسكتوب: بطاقات كبيرة */}
      <div className="hidden sm:grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {promoTiles.map((tile) => (
          <Link
            key={tile.id}
            to={tile.link}
            className={[
              tile.bgColor,
              tile.textColor,
              'rounded-lg p-8 md:p-10 hover:scale-105 transition-transform shadow-luxury',
            ].join(' ')}
          >
            <h3 className="text-2xl md:text-3xl font-bold mb-2">
              {tile.title[lang]}
            </h3>
            <p className="text-sm md:text-base opacity-90">
              {tile.description[lang]}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
