import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function ShopCTA() {
  const { t, i18n } = useTranslation();
  const arrow = i18n.language === 'ar' ? '←' : '→';

  return (
    <section className="px-4 sm:px-6 md:px-8 lg:px-12 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-[32px] bg-gradient-to-br from-ivory via-sand/70 to-white border border-sand/70 p-6 sm:p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <p className="text-sm text-taupe mb-2">{t('home.startShopping', 'ابدأ التسوق الآن')}</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal">
                {t('home.findYourScent', 'اكتشف العطر المناسب لك خلال دقيقة')}
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Link
                to="/new"
                className="flex-1 bg-gold text-charcoal px-6 py-3 rounded-luxury font-semibold hover:bg-gold-hover transition text-center"
              >
                {t('home.shopNew', 'تسوق الجديد')} {arrow}
              </Link>
              <Link
                to="/used"
                className="flex-1 bg-white text-charcoal px-6 py-3 rounded-luxury font-semibold border border-sand hover:border-gold transition text-center"
              >
                {t('home.shopUsed', 'تسوق المستعمل')} {arrow}
              </Link>
              <Link
                to="/auctions"
                className="flex-1 bg-charcoal text-ivory px-6 py-3 rounded-luxury font-semibold hover:bg-charcoal-light transition text-center"
              >
                {t('home.shopAuctions', 'تسوق المزادات')} {arrow}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
