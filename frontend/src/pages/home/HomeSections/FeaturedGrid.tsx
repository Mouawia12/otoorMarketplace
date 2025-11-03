import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProductCard from '../../../components/products/ProductCard';
import { Product } from '../../../types';

interface FeaturedGridProps {
  title: { ar: string; en: string };
  products: any[];
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

  const transformProduct = (mockProduct: any): Product => ({
    id: mockProduct.id,
    seller_id: 1,
    name_ar: mockProduct.name.ar,
    name_en: mockProduct.name.en,
    description_ar: '',
    description_en: '',
    product_type: 'perfume',
    brand: mockProduct.brand,
    category: 'fragrance',
    base_price: mockProduct.price_usd,
    size_ml: 100,
    concentration: 'EDP',
    condition: type === 'used' ? 'used' : 'new',
    stock_quantity: 10,
    image_urls: [mockProduct.image],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-charcoal">{title[lang]}</h2>
        <Link to={ctaLink} className="text-gold hover:text-gold-dark font-semibold flex items-center gap-2">
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

      {/* 👇 الشبكة: 2 (موبايل) / 3 (تابلت) / 6 (لابتوب+) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={transformProduct(product)} type={type} />
        ))}
      </div>
    </section>
  );
}
