import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { fetchProductById, fetchProducts, fetchRelatedProducts } from '../services/productService';
import { fetchAuctionByProductId } from '../services/auctionService';
import ProductCard from '../components/products/ProductCard';
import { Product, Auction, ProductReview } from '../types';
import { fetchProductReviews } from '../services/reviewService';
import { formatPrice } from '../utils/currency';
import SARIcon from '../components/common/SARIcon';
import { resolveProductImageUrl } from '../utils/image';
import Countdown from '../components/common/Countdown';
import { PLACEHOLDER_PERFUME } from '../utils/staticAssets';
import ProductImageCarousel from '../components/products/ProductImageCarousel';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const addToCart = useCartStore((state) => state.add);
  const addToWishlist = useWishlistStore((s) => s.add);
  const removeFromWishlist = useWishlistStore((s) => s.remove);
  const wishlistHas = useWishlistStore((s) => s.has);
  
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [brandProducts, setBrandProducts] = useState<Product[]>([]);
  const [activeAuction, setActiveAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewStats, setReviewStats] = useState<{ average: number; count: number }>({
    average: 0,
    count: 0,
  });
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      if (!id || isNaN(parseInt(id))) {
        setLoading(false);
        setProduct(null);
        return;
      }
      
      setLoading(true);
      try {
        const productData = await fetchProductById(parseInt(id));
        setProduct(productData);
        
        const related = await fetchRelatedProducts(parseInt(id), 4);
        setRelatedProducts(related);

        if (productData.brand) {
          const brandResult = await fetchProducts({
            brand: productData.brand,
            page_size: 6,
            sort: 'newest',
          });
          const filtered = brandResult.products.filter((item) => item.id !== productData.id);
          setBrandProducts(filtered.slice(0, 6));
        } else {
          setBrandProducts([]);
        }

        try {
          const reviewData = await fetchProductReviews(parseInt(id));
          setReviews(reviewData.reviews);
          setReviewStats({ average: reviewData.average, count: reviewData.count });
        } catch (reviewError) {
          console.warn('Failed to load reviews', reviewError);
        }
        
        try {
          const auction = await fetchAuctionByProductId(parseInt(id));
          if (auction && auction.status === 'active' && new Date(auction.end_time) > new Date()) {
            setActiveAuction(auction);
          } else {
            setActiveAuction(null);
          }
        } catch (_auctionError) {
          setActiveAuction(null);
        }
      } catch (error) {
        console.error('Error loading product:', error);
        setProduct(null);
        setBrandProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadProduct();
  }, [id, isAuthenticated]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.loading')}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('productDetail.notFound')}</p>
        <button
          onClick={() => navigate('/new')}
          className="mt-4 bg-gold text-charcoal px-6 py-2 rounded-luxury font-semibold hover:bg-gold-hover transition"
        >
          {t('productDetail.backToShop')}
        </button>
      </div>
    );
  }
  const resolvedImage = resolveProductImageUrl(product.image_urls?.[0]) || PLACEHOLDER_PERFUME;
  const hasInWishlist = product ? wishlistHas(String(product.id)) : false;
  const toggleWishlist = async () => {
    if (!product) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      setWishlistLoading(true);
      if (hasInWishlist) {
        removeFromWishlist(String(product.id));
        await fetch(`${import.meta.env.VITE_API_URL || '/api'}/wishlist/${product.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      } else {
        addToWishlist({
          id: String(product.id),
          name,
          price: product.base_price,
          image: resolvedImage,
          brand: product.brand,
        });
        await fetch(`${import.meta.env.VITE_API_URL || '/api'}/wishlist`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId: product.id }),
        });
      }
    } catch (error) {
      console.error('Failed to toggle wishlist from detail page', error);
    } finally {
      setWishlistLoading(false);
    }
  };

  const name = language === 'ar' ? product.name_ar : product.name_en;
  const description = language === 'ar' ? product.description_ar : product.description_en;
  const resolvedImages = (product.image_urls || [])
    .map((img) => resolveProductImageUrl(img) || '')
    .filter(Boolean);
  const images = resolvedImages.length ? resolvedImages : [PLACEHOLDER_PERFUME];
  const isInStock = product.stock_quantity > 0;
  const ratingLabel = reviewStats.count > 0 ? reviewStats.average.toFixed(1) : t('reviews.noRatings');
  const sellerName = product.seller?.full_name;
  const sellerVerified = product.seller?.verified_seller;
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const renderStars = (value: number) => (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = value >= index + 0.5;
        return (
          <svg
            key={index}
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill={filled ? '#f6b300' : 'none'}
            stroke="#f6b300"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 17.3l-5.2 3.1 1.5-5.8-4.5-3.9 5.9-.5L12 5l2.3 5.2 5.9.5-4.5 3.9 1.5 5.8z"
            />
          </svg>
        );
      })}
    </div>
  );

  const handleBuyNow = () => {
    if (!isInStock || !product) return;
    const primaryImage = images[0] || PLACEHOLDER_PERFUME;
    addToCart(
      {
        id: String(product.id),
        name,
        price: product.base_price,
        image: primaryImage,
        brand: product.brand,
      },
      1
    );
    const target = '/checkout';
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(target)}`);
      return;
    }
    navigate(target);
  };

  return (
    <div className="space-y-12 pb-24 lg:pb-0">
      {/* Active Auction Banner */}
      {activeAuction && (
        <div className="bg-gradient-to-r from-gold to-gold-light rounded-luxury p-6 shadow-luxury">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-charcoal mb-2">{t('auction.activeAuction')}</h3>
              <div className="flex items-center gap-6 text-charcoal">
                <div>
                  <p className="text-sm opacity-80">{t('auction.currentBid')}</p>
                  <p className="text-2xl font-bold inline-flex items-center gap-1">
                    {formatPrice(activeAuction.current_price, language).replace(/\s?(SAR|﷼)$/i, '')}
                    <SARIcon size={18} />
                  </p>
                </div>
                <div>
                  <p className="text-sm opacity-80">{t('auction.totalBids')}</p>
                  <p className="text-xl font-bold">{activeAuction.total_bids || 0}</p>
                </div>
                <div>
                  <p className="text-sm opacity-80">{t('auction.timeRemaining')}</p>
                  <Countdown 
                    endAt={activeAuction.end_time} 
                    compact 
                    className="text-xl font-bold text-charcoal"
                  />
                </div>
              </div>
            </div>
            <Link
              to={`/auction/${activeAuction.id}`}
              className="bg-charcoal text-ivory px-8 py-3 rounded-luxury font-semibold hover:bg-charcoal-light transition whitespace-nowrap"
            >
              {t('auction.goToAuction')}
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ProductImageCarousel
          images={images}
          name={name}
          fallback={PLACEHOLDER_PERFUME}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          overlay={(
            <button
              onClick={toggleWishlist}
              disabled={wishlistLoading}
              className={`w-full rounded-full px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg transition ${
                hasInWishlist ? 'bg-gold text-charcoal' : 'bg-white/90 text-charcoal'
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill={hasInWishlist ? 'currentColor' : 'none'} stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20.8 4.6a5 5 0 0 0-7.1 0L12 6.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 22l8.8-10.3a5 5 0 0 0 0-7.1z" />
              </svg>
              <span>{hasInWishlist ? t('wishlist.remove') : t('wishlist.add', 'أضف للمفضلة')}</span>
            </button>
          )}
        />

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <Link
              to={`/products?brand=${encodeURIComponent(product.brand)}&status=published`}
              className="text-taupe text-sm mb-2 inline-block hover:text-gold transition-colors"
            >
              {product.brand}
            </Link>
            <h1 className="text-h1 text-charcoal mb-4">{name}</h1>
            <p className="text-charcoal-light leading-relaxed break-words whitespace-pre-line">
              {description}
            </p>
          </div>

          <div className="border-t border-b border-gray-200 py-6 space-y-3">
            <div className="flex justify-between">
              <span className="text-taupe">{t('productDetail.size')}</span>
              <span className="text-charcoal font-semibold">{product.size_ml}ml</span>
            </div>
            <div className="flex justify-between">
              <span className="text-taupe">{t('productDetail.concentration')}</span>
              <span className="text-charcoal font-semibold">{product.concentration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-taupe">{t('productDetail.category')}</span>
              <span className="text-charcoal font-semibold">{product.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-taupe">{t('productDetail.stock')}</span>
              <span className={`font-semibold ${isInStock ? 'text-success' : 'text-alert'}`}>
                {isInStock ? `${product.stock_quantity} ${t('productDetail.available')}` : t('products.outOfStock')}
              </span>
            </div>
          </div>

          <div className="rounded-luxury border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm text-charcoal-light">{t('products.seller')}</p>
                <p className="text-charcoal font-semibold">{sellerName ?? t('products.sellerUnknown')}</p>
              </div>
              {sellerVerified && (
                <span className="px-3 py-1 rounded-full text-xs bg-success text-white font-semibold">
                  {t('auction.verifiedSeller')}
                </span>
              )}
            </div>
            {product.seller?.id && (
              <div className="mt-3">
                <Link
                  to={`/store/${product.seller.id}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal border border-sand/70 px-3 py-2 rounded-luxury hover:bg-sand/60 transition"
                >
                  زيارة متجر البائع
                  <span aria-hidden>↗</span>
                </Link>
              </div>
            )}
          </div>

          <div className="bg-sand rounded-luxury p-6">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold text-gold inline-flex items-center gap-2">
                {formatPrice(product.base_price, language).replace(/\s?(SAR|﷼)$/i, '')}
                <SARIcon size={22} className="text-gold" />
              </span>
            </div>

            <div className="space-y-3">
              <button
                disabled={!isInStock}
                onClick={handleBuyNow}
                className="w-full bg-gold text-charcoal px-6 py-3 rounded-luxury font-semibold hover:bg-gold-hover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>{isInStock ? t('productDetail.buyNow') : t('products.outOfStock')}</span>
                {!isInStock && (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 9l6 6M15 9l-6 6" />
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-12px_24px_rgba(0,0,0,0.08)] lg:hidden z-40">
        <div className="flex items-center justify-between gap-3">
          <div className="text-gold font-bold text-lg inline-flex items-center gap-1">
            {formatPrice(product.base_price, language).replace(/\s?(SAR|﷼)$/i, '')}
            <SARIcon size={16} className="text-gold" />
          </div>
          <button
            disabled={!isInStock}
            onClick={handleBuyNow}
            className="bg-gold text-charcoal px-5 py-2.5 rounded-luxury font-semibold hover:bg-gold-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInStock ? t('productDetail.buyNow') : t('products.outOfStock')}
          </button>
        </div>
      </div>

      {/* Reviews */}
      <section className="bg-white rounded-luxury shadow-luxury p-6">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/3 bg-sand/50 rounded-luxury p-5 space-y-3">
            <p className="text-sm text-charcoal-light">{t('reviews.overall')}</p>
            <div className="text-4xl font-bold text-charcoal">{reviewStats.count ? reviewStats.average.toFixed(1) : '—'}</div>
            <div className="flex items-center gap-2">
              {renderStars(reviewStats.average || 0)}
              <span className="text-sm text-charcoal-light">
                {reviewStats.count} {t('reviews.count')}
              </span>
            </div>
            <p className="text-sm text-charcoal mt-2">{t('reviews.tagline')}</p>
            <p className="text-xs text-charcoal-light">{ratingLabel}</p>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-charcoal">{t('reviews.title')}</h3>
              <span className="text-sm text-charcoal-light">{t('reviews.recent')}</span>
            </div>

            {reviews.length === 0 ? (
              <div className="p-4 rounded-luxury bg-ivory text-charcoal-light">
                {t('reviews.empty')}
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="border border-sand/60 rounded-luxury p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-charcoal">
                          {review.user?.full_name || t('reviews.anonymous')}
                        </p>
                        <p className="text-xs text-charcoal-light">
                          {new Date(review.created_at).toLocaleDateString(locale)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm font-semibold text-gold">{review.rating}/5</span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="mt-3 text-sm text-charcoal-light leading-relaxed">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-gray-200 pt-12">
          <h2 className="text-h2 text-charcoal mb-6">{t('productDetail.relatedProducts')}</h2>
          <div className="responsive-card-grid responsive-card-grid--roomy">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} type="new" />
            ))}
          </div>
        </div>
      )}

      {brandProducts.length > 0 && (
        <div className="border-t border-gray-200 pt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-h2 text-charcoal">
              {t('productDetail.moreFromBrand', 'مزيد من منتجات نفس العلامة')}
            </h2>
            <Link
              to={`/products?brand=${encodeURIComponent(product.brand)}&status=published`}
              className="text-sm text-gold hover:text-charcoal transition"
            >
              {t('productDetail.viewBrand', 'عرض العلامة')}
            </Link>
          </div>
          <div className="responsive-card-grid responsive-card-grid--roomy">
            {brandProducts.map((brandProduct) => (
              <ProductCard key={`brand-${brandProduct.id}`} product={brandProduct} type="new" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
