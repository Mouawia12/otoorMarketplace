import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Countdown from '../../../components/common/Countdown';
import SARIcon from '../../../components/common/SARIcon';
import { Auction, Product } from '../../../types';
import { resolveImageUrl } from '../../../utils/image';
import { PLACEHOLDER_PERFUME } from '../../../utils/staticAssets';

interface AuctionsStripProps {
  auctions: Auction[];
}

export default function AuctionsStrip({ auctions }: AuctionsStripProps) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language as 'ar' | 'en') || 'ar';
  const locale = lang === 'ar' ? 'ar-SA' : 'en-US';

  const visibleAuctions = auctions.filter(
    (auction): auction is Auction & { product: Product } => Boolean(auction.product)
  );

  if (!visibleAuctions.length) return null;

  // رقم فقط بدون العملة
  const formatNumber = (v: number) =>
    new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }).format(v || 0);

  return (
    <section className="bg-charcoal-light py-6 md:py-8 rounded-t-[32px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        {/* العنوان ورابط مشاهدة الكل */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gold/70">
              {t('home.liveNow', 'مزادات مباشرة')}
            </p>
            <h2 className="text-2xl font-extrabold text-ivory">
              {t('home.liveAuctions')}
            </h2>
          </div>
          <Link
            to="/auctions"
            className="text-gold hover:text-gold-light font-semibold flex items-center gap-2 text-sm md:text-base"
          >
            {t('home.viewAllAuctions')}
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={lang === 'ar' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
              />
            </svg>
          </Link>
        </div>

        {/* شريط أفقي ببطاقات أصغر على الجوال، وشبكة على الشاشات الأكبر */}
        <div className="-mx-3 px-3 overflow-x-auto pb-2 md:overflow-visible md:mx-0 md:px-0 snap-x snap-mandatory">
          <div className="flex gap-4 md:grid md:grid-cols-3 lg:grid-cols-5 md:gap-4 min-w-max md:min-w-0">
            {visibleAuctions.slice(0, 8).map((auction) => {
              const title = lang === 'ar' ? auction.product.name_ar : auction.product.name_en;
              const current = auction.current_price ?? auction.starting_price ?? 0;
              const bidsCount = auction.total_bids ?? 0;
              const image = resolveImageUrl(auction.product.image_urls?.[0]) || PLACEHOLDER_PERFUME;

              return (
                <Link
                  key={auction.id}
                  to={`/auction/${auction.id}`}
                  className="group bg-charcoal rounded-lg overflow-hidden shadow-luxury hover:shadow-gold transition-all
                             min-w-[230px] w-[230px] md:min-w-0 md:w-auto flex-shrink-0 snap-start"
                >
                  {/* الصورة */}
                  <div className="aspect-[3/4] overflow-hidden bg-sand">
                    <img
                      src={image}
                      alt={title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {/* المحتوى */}
                  <div className="p-3">
                    <h3 className="font-semibold text-ivory text-sm line-clamp-2 min-h-[2.6em]">
                      {title}
                    </h3>

                    <div className="mt-2 flex items-start justify-between gap-2">
                      {/* السعر الحالي */}
                      <div>
                        <p className="text-[11px] text-sand/80 mb-0.5">
                          {t('auction.currentBid')}
                        </p>
                        <p
                          className={`text-gold font-bold text-base inline-flex items-center gap-1 ${
                            lang === 'ar' ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <SARIcon size={14} />
                          <span>{formatNumber(current)}</span>
                        </p>
                      </div>

                      {/* عدد المزايدات */}
                      <div className="text-end">
                        <p className="text-[11px] text-sand/80 mb-0.5">
                          {t('auction.bids')}
                        </p>
                        <p className="text-ivory font-semibold text-sm">
                          {bidsCount}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-charcoal-light">
                      <Countdown
                        endAt={auction.end_time}
                        compact
                        className="text-[12px] font-mono text-gold"
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
