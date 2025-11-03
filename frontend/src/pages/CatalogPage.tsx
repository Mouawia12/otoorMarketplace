import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/products/ProductCard';
import ProductFilters from '../components/products/ProductFilters';
import Pagination from '../components/common/Pagination';
import { fetchProducts } from '../services/productService';
import { Product } from '../types';

interface CatalogPageProps {
  catalogType: 'new' | 'used' | 'auctions';
}

export default function CatalogPage({ catalogType }: CatalogPageProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    brand: searchParams.get('brand') || '',
    category: searchParams.get('category') || '',
    condition: catalogType === 'new' ? 'new' : catalogType === 'used' ? 'used' : '',
    min_price: searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : undefined,
    max_price: searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined,
    sort: searchParams.get('sort') || '',
  });

  useEffect(() => {
    loadProducts();
  }, [filters, currentPage, catalogType]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const result = await fetchProducts({
        ...filters,
        condition: filters.condition,
        page: currentPage,
        page_size: 12,
      });
      setProducts(result.products);
      setTotalPages(result.total_pages);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1);
    
    // Update URL params
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    setSearchParams(params);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getTitle = () => {
    if (catalogType === 'new') return t('catalog.newPerfumes');
    if (catalogType === 'used') return t('catalog.usedPerfumes');
    return t('catalog.auctionPerfumes');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal">{getTitle()}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="lg:col-span-1">
          <ProductFilters filters={filters} onFilterChange={handleFilterChange} />
        </div>

        <div className="lg:col-span-3">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-taupe">{t('common.loading')}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-taupe">{t('catalog.noProducts')}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    type={catalogType === 'auctions' ? 'auction' : catalogType}
                    currentBid={catalogType === 'auctions' ? product.base_price * 1.2 : undefined}
                  />
                ))}
              </div>

              <div className="mt-6 sm:mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
