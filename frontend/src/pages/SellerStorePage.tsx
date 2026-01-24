import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProducts } from '../services/productService';
import ProductCard from '../components/products/ProductCard';
import { Product } from '../types';

const sortOptions = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'الأقل سعراً' },
  { value: 'price_desc', label: 'الأعلى سعراً' },
  { value: 'stock', label: 'الأكثر توفراً' },
];

export default function SellerStorePage() {
  const { sellerId } = useParams<{ sellerId: string }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sellerInfo = useMemo(() => {
    const first = products[0];
    if (!first?.seller) return null;
    return first.seller;
  }, [products]);

  useEffect(() => {
    const load = async () => {
      if (!sellerId || Number.isNaN(Number(sellerId))) {
        setError('رقم المتجر غير صالح');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await fetchProducts({
          seller: Number(sellerId),
          page,
          page_size: pageSize,
          sort,
          search: search.trim() || undefined,
        });
        setProducts(response.products ?? []);
        setTotal(response.total ?? 0);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'تعذر تحميل منتجات المتجر');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sellerId, page, pageSize, sort, search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top,_rgba(214,170,89,0.25),_rgba(255,255,255,0.9)_65%)] border border-sand/60 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-sm text-taupe">متجر البائع</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-charcoal">
              {sellerInfo?.full_name || 'متجر العطور'}
            </h1>
            <p className="text-taupe mt-2">
              {sellerInfo?.verified_seller
                ? 'بائع موثّق يعرض مجموعته المختارة من العطور.'
                : 'اكتشف منتجات هذا البائع واختر ما يناسبك.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {sellerInfo?.verified_seller && (
              <span className="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-semibold">
                بائع موثّق
              </span>
            )}
            <div className="px-4 py-2 rounded-full bg-charcoal text-ivory text-sm font-semibold">
              {total} منتج
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute -left-16 -bottom-24 h-56 w-56 rounded-full bg-amber-200/30 blur-3xl" />
      </section>

      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative">
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="ابحث داخل متجر البائع"
              className="w-full sm:w-72 border border-sand/60 rounded-luxury px-4 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
            />
            <span className="absolute left-4 top-3 text-taupe">🔍</span>
          </div>
          <select
            value={sort}
            onChange={(event) => {
              setPage(1);
              setSort(event.target.value);
            }}
            className="border border-sand/60 rounded-luxury px-4 py-3 bg-white focus:ring-2 focus:ring-gold focus:border-gold outline-none"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <Link
          to="/products"
          className="text-charcoal font-semibold hover:text-gold transition"
        >
          العودة للتسوق
        </Link>
      </section>

      {loading && (
        <div className="text-center py-12 text-taupe">جارٍ تحميل منتجات المتجر...</div>
      )}

      {error && (
        <div className="text-center py-12 text-alert font-semibold">{error}</div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="text-center py-12 text-taupe">لا توجد منتجات متاحة حالياً.</div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-luxury border border-sand/60 text-charcoal disabled:opacity-50"
          >
            السابق
          </button>
          <span className="text-sm text-taupe">
            صفحة {page} من {totalPages}
          </span>
          <button
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-luxury border border-sand/60 text-charcoal disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
