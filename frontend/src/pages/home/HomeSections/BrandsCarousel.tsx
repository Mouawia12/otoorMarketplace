import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brand } from '../../../services/homeService';

interface BrandsCarouselProps {
  brands: Brand[];
}

export default function BrandsCarousel({ brands }: BrandsCarouselProps) {
  const { t } = useTranslation();
  const [paused, setPaused] = useState(false);

  const visibleBrands = useMemo(() => brands.filter((brand) => brand?.name), [brands]);
  const marqueeBrands = useMemo(() => [...visibleBrands, ...visibleBrands], [visibleBrands]);

  if (!visibleBrands.length) return null;

  const animationStyle: React.CSSProperties = {
    animationName: 'brand-marquee',
    animationDuration: '36s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    animationPlayState: paused ? 'paused' : 'running',
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-12">
      <style>{`
        @keyframes brand-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <h2 className="text-2xl md:text-3xl font-bold text-charcoal mb-6 text-center">
        {t('home.topBrands')}
      </h2>

      <div
        className="relative overflow-hidden rounded-2xl border border-sand/70 bg-white/70 shadow-sm"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className="pointer-events-none absolute inset-y-0 start-0 w-10 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 end-0 w-10 bg-gradient-to-l from-white to-transparent" />

        <div className="overflow-hidden py-4">
          <div className="flex w-max min-w-full gap-4 px-4 sm:px-6" style={animationStyle}>
            {marqueeBrands.map((brand, index) => (
              <Link
                key={`${brand.id}-${index}`}
                to={`/products?brand=${encodeURIComponent(brand.name)}&status=published`}
                className="flex h-20 w-40 sm:h-24 sm:w-48 flex-shrink-0 items-center justify-center rounded-xl border border-sand/60 bg-ivory px-4 text-center transition hover:-translate-y-0.5 hover:border-gold/60 hover:bg-white hover:shadow-luxury"
                title={brand.name}
              >
                {brand.logo ? (
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="max-h-full max-w-full object-contain opacity-80 transition hover:opacity-100"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-sm font-bold tracking-wide text-charcoal">
                    {brand.name}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
