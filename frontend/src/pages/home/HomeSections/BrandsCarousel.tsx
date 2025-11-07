import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brand } from '../../../services/homeService';

interface BrandsCarouselProps {
  brands: Brand[];
}

export default function BrandsCarousel({ brands }: BrandsCarouselProps) {
  const { t } = useTranslation();

  if (!brands.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-charcoal mb-6 text-center">
        {t('home.topBrands')}
      </h2>
      
      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <div className="flex gap-6 min-w-max md:grid md:grid-cols-4 lg:grid-cols-6 md:min-w-0">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              to={`/search?brand=${encodeURIComponent(brand.name)}`}
              className="flex items-center justify-center bg-ivory rounded-lg p-6 hover:bg-sand transition-colors shadow-md hover:shadow-luxury w-40 h-24 md:w-auto flex-shrink-0"
            >
              {brand.logo ? (
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="max-w-full max-h-full object-contain opacity-70 hover:opacity-100 transition-opacity"
                  loading="lazy"
                />
              ) : (
                <span className="text-charcoal font-semibold text-sm text-center">
                  {brand.name}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
