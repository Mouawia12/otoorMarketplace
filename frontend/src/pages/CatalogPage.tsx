import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/products/ProductCard';
import ProductFilters from '../components/products/ProductFilters';
import Pagination from '../components/common/Pagination';
import { fetchProducts, fetchProductFiltersMeta, ProductFiltersMeta } from '../services/productService';
import { fetchAuctions } from '../services/auctionService';
import { Product, Auction } from '../types';

interface CatalogPageProps {
  catalogType: 'new' | 'used' | 'auctions';
}

export default function CatalogPage({ catalogType }: CatalogPageProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [auctionItems, setAuctionItems] = useState<Array<{ auction: Auction; product: Product }>>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterMeta, setFilterMeta] = useState<ProductFiltersMeta | null>(null);

  const lockedCondition = catalogType === 'new' ? 'new' : catalogType === 'used' ? 'used' : undefined;

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    brand: searchParams.get('brand') || '',
    category: searchParams.get('category') || '',
    condition: lockedCondition ?? searchParams.get('condition') ?? 'all',
    min_price: searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : undefined,
    max_price: searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined,
    sort: searchParams.get('sort') || 'newest',
  });

  useEffect(() => {
    let cancelled = false;
    const loadMeta = async () => {
      try {
        const meta = await fetchProductFiltersMeta();
        if (!cancelled) {
          setFilterMeta(meta);
        }
      } catch (error) {
        console.error('Failed to load product filters meta', error);
      }
    };
    loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      condition: lockedCondition ?? prev.condition ?? 'all',
    }));
    setCurrentPage(1);
  }, [catalogType]);

  useEffect(() => {
    loadProducts();
  }, [filters, currentPage, catalogType]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      if (catalogType === 'auctions') {
        const auctions = await fetchAuctions();
        const filtered = applyAuctionFilters(auctions);
        const { paginated, total } = paginate(filtered, currentPage);

        const mapped = paginated
          .filter((auction) => auction.product)
          .map((auction) => ({
            auction,
            product: auction.product as Product,
          }));

        setAuctionItems(mapped);
        setProducts(mapped.map((item) => item.product));
        setTotalPages(Math.max(1, Math.ceil(total / 12)));
      } else {
        const { condition, ...restFilters } = filters;
        const effectiveCondition = lockedCondition
          ? lockedCondition.toUpperCase()
          : condition && condition !== 'all'
          ? condition.toUpperCase()
          : undefined;

        const result = await fetchProducts({
          ...restFilters,
          ...(effectiveCondition ? { condition: effectiveCondition } : {}),
          page: currentPage,
          page_size: 12,
        });
        setProducts(result.products);
        setAuctionItems([]);
        setTotalPages(result.total_pages);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyAuctionFilters = (auctions: Auction[]) => {
    return auctions.filter((auction) => {
      if (!auction.product) return false;
      if (auction.status !== 'active') return false;
      const product = auction.product;
      const searchMatch =
        !filters.search ||
        product.name_en.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.name_ar.includes(filters.search) ||
        product.brand.toLowerCase().includes(filters.search.toLowerCase());
      const brandMatch = !filters.brand || product.brand === filters.brand;
      const categoryMatch = !filters.category || product.category === filters.category;
      const minPriceMatch =
        filters.min_price === undefined || Number(auction.current_price) >= filters.min_price;
      const maxPriceMatch =
        filters.max_price === undefined || Number(auction.current_price) <= filters.max_price;

      return searchMatch && brandMatch && categoryMatch && minPriceMatch && maxPriceMatch;
    }).sort(sortAuctions);
  };

  const sortAuctions = (a: Auction, b: Auction) => {
    const sort = filters.sort;
    const priceA = Number(a.current_price);
    const priceB = Number(b.current_price);
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();

    switch (sort) {
      case 'price_asc':
        return priceA - priceB;
      case 'price_desc':
        return priceB - priceA;
      case 'oldest':
        return dateA - dateB;
      default:
        return dateB - dateA;
    }
  };

  const paginate = (items: Auction[], page: number) => {
    const start = (page - 1) * 12;
    const end = start + 12;
    return {
      paginated: items.slice(start, end),
      total: items.length,
    };
  };

  const handleFilterChange = useCallback(
    (newFilters: Partial<typeof filters>) => {
      let nextFiltersState: typeof filters | undefined;
      setFilters((prev) => {
        nextFiltersState = {
          ...prev,
          ...newFilters,
          condition: lockedCondition ?? newFilters.condition ?? prev.condition ?? 'all',
        };
        return nextFiltersState;
      });
      setCurrentPage(1);

      if (!nextFiltersState) {
        return;
      }

      const params = new URLSearchParams();
      if (nextFiltersState.search) params.set('search', nextFiltersState.search);
      if (nextFiltersState.brand) params.set('brand', nextFiltersState.brand);
      if (nextFiltersState.category) params.set('category', nextFiltersState.category);
      if (!lockedCondition && nextFiltersState.condition && nextFiltersState.condition !== 'all') {
        params.set('condition', nextFiltersState.condition);
      }
      if (nextFiltersState.sort && nextFiltersState.sort !== 'newest') {
        params.set('sort', nextFiltersState.sort);
      }
      if (typeof nextFiltersState.min_price === 'number') {
        params.set('min_price', String(nextFiltersState.min_price));
      }
      if (typeof nextFiltersState.max_price === 'number') {
        params.set('max_price', String(nextFiltersState.max_price));
      }
      setSearchParams(params);
    },
    [lockedCondition, setSearchParams]
  );

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

      <ProductFilters
        className="w-full"
        filters={filters}
        onFilterChange={handleFilterChange}
        meta={filterMeta ?? undefined}
        lockedCondition={lockedCondition}
      />

      {loading ? (
        <div className="text-center py-12">
          <p className="text-taupe">{t('common.loading')}</p>
        </div>
      ) : (catalogType === 'auctions' ? auctionItems.length === 0 : products.length === 0) ? (
        <div className="text-center py-12">
          <p className="text-taupe">{t('catalog.noProducts')}</p>
        </div>
      ) : (
        <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {catalogType === 'auctions'
                  ? auctionItems.map(({ auction, product }) => (
                      <ProductCard
                        key={auction.id}
                        product={product}
                        type="auction"
                        auctionId={auction.id}
                        currentBid={Number(auction.current_price)}
                        auctionEndDate={auction.end_time}
                      />
                    ))
                  : products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    type={catalogType}
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
  );
}
