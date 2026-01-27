import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/products/ProductCard';
import ProductFilters from '../components/products/ProductFilters';
import Pagination from '../components/common/Pagination';
import { fetchProducts, fetchProductFiltersMeta, ProductFiltersMeta } from '../services/productService';
import { matchesSearch } from '../utils/search';
import { fetchAuctions } from '../services/auctionService';
import { Product, Auction } from '../types';

interface CatalogPageProps {
  catalogType: 'new' | 'used' | 'auctions';
}

type AuctionDisplayStatus = 'active' | 'scheduled' | 'ended';

interface AuctionCatalogItem {
  auction: Auction;
  product: Product;
  displayStatus: AuctionDisplayStatus;
}

export default function CatalogPage({ catalogType }: CatalogPageProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [auctionItems, setAuctionItems] = useState<AuctionCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterMeta, setFilterMeta] = useState<ProductFiltersMeta | null>(null);
  const [fallbackProducts, setFallbackProducts] = useState<Product[]>([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);

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

  const fetchFallbackRecommendations = async (condition?: string) => {
    try {
      setFallbackLoading(true);
      const fallback = await fetchProducts({
        ...(condition ? { condition } : {}),
        sort: 'newest',
        page: 1,
        page_size: 8,
      });
      setFallbackProducts(fallback.products ?? []);
    } catch (error) {
      console.error('Failed to load fallback products', error);
      setFallbackProducts([]);
    } finally {
      setFallbackLoading(false);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    setFallbackProducts([]);
    try {
      if (catalogType === 'auctions') {
        const auctions = await fetchAuctions();
        const filtered = applyAuctionFilters(auctions);
        const { paginated, total } = paginate(filtered, currentPage);
        setAuctionItems(paginated);
        setProducts(paginated.map((item) => item.product));
        setTotalPages(Math.max(1, Math.ceil(total / 12)));

        if (total === 0) {
          await fetchFallbackRecommendations();
        }
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

        if ((result.products ?? []).length === 0) {
          await fetchFallbackRecommendations(effectiveCondition);
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAuctionDisplayStatus = (
    auction: Auction,
    nowMs: number
  ): AuctionDisplayStatus | null => {
    const rawStatus = typeof auction.status === 'string' ? auction.status.toLowerCase() : '';
    if (rawStatus === 'pending_review' || rawStatus === 'cancelled') {
      return null;
    }

    const startMs = new Date(auction.start_time).getTime();
    const endMs = new Date(auction.end_time).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      return null;
    }

    if (rawStatus === 'completed' || endMs <= nowMs) {
      return 'ended';
    }

    return startMs > nowMs ? 'scheduled' : 'active';
  };

  const applyAuctionFilters = (auctions: Auction[]): AuctionCatalogItem[] => {
    const nowMs = Date.now();
      const filtered = auctions.flatMap((auction) => {
        if (!auction.product) return [];
      const displayStatus = resolveAuctionDisplayStatus(auction, nowMs);
      if (!displayStatus) return [];

      const product = auction.product as Product;
      const searchMatch =
        !filters.search ||
        matchesSearch(product.name_en ?? "", filters.search) ||
        matchesSearch(product.name_ar ?? "", filters.search) ||
        matchesSearch(product.brand ?? "", filters.search);
      const brandMatch = !filters.brand || product.brand === filters.brand;
      const categoryMatch = !filters.category || product.category === filters.category;
      const minPriceMatch =
        filters.min_price === undefined || Number(auction.current_price) >= filters.min_price;
      const maxPriceMatch =
        filters.max_price === undefined || Number(auction.current_price) <= filters.max_price;

      if (!searchMatch || !brandMatch || !categoryMatch || !minPriceMatch || !maxPriceMatch) {
        return [];
      }

      return [
        {
          auction,
          product,
          displayStatus,
        },
      ];
    });

    return filtered.sort(sortAuctions);
  };

  const sortAuctions = (a: AuctionCatalogItem, b: AuctionCatalogItem) => {
    const sort = filters.sort;
    const priceA = Number(a.auction.current_price);
    const priceB = Number(b.auction.current_price);
    const dateA = new Date(a.auction.created_at).getTime();
    const dateB = new Date(b.auction.created_at).getTime();

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

  const paginate = (items: AuctionCatalogItem[], page: number) => {
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
        <div className="space-y-6">
          <div className="text-center py-10">
            <p className="text-charcoal font-semibold text-lg">{t('catalog.noProducts')}</p>
            <p className="text-taupe text-sm mt-2">
              {t('catalog.emptyHint', 'جرّب تعديل البحث أو استكشف اقتراحاتنا بالأسفل.')}
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-charcoal">
                {t('catalog.fallbackTitle', 'اقتراحات قد تعجبك')}
              </h2>
            </div>
            {fallbackLoading ? (
              <div className="text-center py-8 text-taupe">{t('common.loading')}</div>
            ) : fallbackProducts.length > 0 ? (
              <div className="responsive-card-grid responsive-card-grid--roomy">
                {fallbackProducts.map((product) => (
                  <ProductCard key={`fallback-${product.id}`} product={product} type={catalogType === 'used' ? 'used' : 'new'} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-taupe text-sm">
                {t('catalog.noFallback', 'لا توجد اقتراحات متاحة حالياً.')}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
              <div className="responsive-card-grid responsive-card-grid--roomy">
                {catalogType === 'auctions'
                  ? auctionItems.map(({ auction, product, displayStatus }) => (
                      <ProductCard
                        key={auction.id}
                        product={product}
                        type="auction"
                        auctionId={auction.id}
                        currentBid={Number(auction.current_price)}
                        auctionStartDate={auction.start_time}
                        auctionEndDate={auction.end_time}
                        auctionStatus={displayStatus}
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
