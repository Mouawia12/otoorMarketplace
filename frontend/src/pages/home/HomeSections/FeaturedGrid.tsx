import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProductCard from '../../../components/products/ProductCard';
import { Product } from '../../../types';

interface FeaturedGridProps {
  title: { ar: string; en: string };
  products: Product[];
  ctaText: { ar: string; en: string };
  ctaLink: string;
  type?: 'new' | 'used';
}

export default function FeaturedGrid({
  title,
  products,
  ctaText,
  ctaLink,
  type = 'new',
}: FeaturedGridProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language as 'ar' | 'en';

  if (!products.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-charcoal">{title[lang]}</h2>
        <Link to={ctaLink} className="text-gold hover:text-gold-dark font-semibold flex items-center gap-2 text-sm sm:text-base">
          {ctaText[lang]}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={i18n.language === 'ar' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
            />
          </svg>
        </Link>
      </div>

      {/* 👇 الشبكة تستجيب تلقائياً مع الحفاظ على حجم بطاقة مريح */}
      <div className="responsive-card-grid responsive-card-grid--compact">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} type={type} />
        ))}
      </div>
    </section>
  );
}
