import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Product } from '../../types';
import { useUIStore } from '../../store/uiStore';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import SARIcon from '../common/SARIcon';
import { formatSAR } from '../../utils/currency';
import { resolveProductImageUrl } from '../../utils/image';
import CountdownTimer from '../auctions/CountdownTimer';
import { PLACEHOLDER_PERFUME } from '../../utils/staticAssets';

interface ProductCardProps {
  product: Product;
  type?: 'new' | 'used' | 'auction';
  currentBid?: number;
  auctionEndDate?: string;
  auctionId?: number;
}

function productLink(p: Product) {
  return `/p/${p.id}`;
}

export default function ProductCard({ product, type = 'new', currentBid, auctionEndDate, auctionId }: ProductCardProps) {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  const targetLink = type === 'auction' && auctionId ? `/auction/${auctionId}` : productLink(product);

  const addToCart = useCartStore((s) => s.add);
  const hasInWishlist = useWishlistStore((s) => s.has(product.id.toString()));
  const addToWishlist = useWishlistStore((s) => s.add);
  const removeFromWishlist = useWishlistStore((s) => s.remove);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const name = language === 'ar' ? product.name_ar : product.name_en;
  const resolvedImage = resolveProductImageUrl(product.image_urls?.[0]) || PLACEHOLDER_PERFUME;
  const displayPriceRaw = type === 'auction' && currentBid ? currentBid : product.base_price;
  const displayPrice = typeof displayPriceRaw === 'number' && !Number.isNaN(displayPriceRaw) ? displayPriceRaw : 0;
  const isAuction = type === 'auction';
  const isAuctionEnded =
    isAuction && auctionEndDate ? new Date(auctionEndDate).getTime() <= Date.now() : false;
  const isOutOfStock = product.stock_quantity <= 0;
  const conditionLabel =
    product.condition === 'used'
      ? t('products.conditionUsed', 'Used')
      : t('products.conditionNew', 'New');
  const conditionTone =
    product.condition === 'used'
      ? 'bg-charcoal/85 text-ivory'
      : 'bg-gold text-charcoal';
  const isTester = Boolean(product.is_tester);
  const testerLabel = t('products.tester', 'Tester');
  const goodsLabel = t('products.goods', 'Goods');
  const testerBadgeLabel = isTester ? testerLabel : goodsLabel;
  const testerBadgeTone = isTester ? 'bg-rose-500 text-white' : 'bg-emerald-600 text-white';
  
  const defaultAuctionEnd = auctionEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const toggleWishlist = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isAuctionEnded) return;
    try {
      if (hasInWishlist) {
        if (isAuthenticated) {
          await api.delete(`/wishlist/${product.id}`);
        }
        removeFromWishlist(product.id.toString());
      } else {
        if (isAuthenticated) {
          await api.post('/wishlist', { productId: product.id });
        }
        addToWishlist({
          id: product.id.toString(),
          name,
          price: displayPrice,
          image: resolvedImage,
          brand: product.brand,
        });
      }
    } catch (error) {
      console.error('Failed to toggle wishlist', error);
    }
  };

  const handleAddToCart = () => {
    if (isAuctionEnded || isOutOfStock) return;
    addToCart(
      {
        id: product.id.toString(),
        name,
        price: displayPrice,
        image: resolvedImage,
        brand: product.brand,
      },
      1
    );
  };

  return (
    <article
      dir={dir}
      className="group bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full"
    >
      {/* الصورة */}
      <div className="relative">
        <Link to={targetLink} className="block aspect-[4/5] w-full bg-sand/60 overflow-hidden">
          <img
            src={resolvedImage}
            alt={name}
            loading="lazy"
            className="w-full h-full object-contain bg-white"
          />
          {isAuctionEnded && (
            <div className="absolute inset-0 bg-charcoal/60 flex items-center justify-center">
              <span className="px-3 py-2 rounded-full bg-white text-charcoal text-xs font-bold shadow">
                {t('auctionDetail.auctionEnded', 'Auction Ended')}
              </span>
            </div>
          )}
        </Link>
        <div className="absolute top-2 flex flex-col gap-2 items-end" style={{ insetInlineEnd: '8px' }}>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-md leading-none ${conditionTone}`}>
            {conditionLabel}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-md leading-none ${testerBadgeTone}`}>
            {testerBadgeLabel}
          </span>
        </div>

        {/* المفضلة */}
        <button
          onClick={toggleWishlist}
          aria-label={hasInWishlist ? t('wishlist.remove') : 'Add to wishlist'}
          disabled={isAuctionEnded}
          className={`absolute top-2 rounded-lg min-w-[34px] min-h-[34px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center bg-white/85 shadow-md ${
            isAuctionEnded ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white'
          }`}
          style={{ insetInlineStart: '8px' }}
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            viewBox="0 0 24 24"
            fill={hasInWishlist ? 'currentColor' : 'none'}
            stroke="currentColor"
          >
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.8 4.6a5 5 0 0 0-7.1 0L12 6.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 22l8.8-10.3a5 5 0 0 0 0-7.1z"
            />
          </svg>
        </button>
      </div>

      {/* المحتوى */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        <div className="min-h-[18px] mb-1">
          {product.brand && (
            <Link
              to={`/products?brand=${encodeURIComponent(product.brand)}&status=published`}
              className="text-xs text-taupe/90 hover:text-gold transition-colors line-clamp-1"
            >
              {product.brand}
            </Link>
          )}
        </div>

        {/* عنوان بسطرين ثابتين لثبات الارتفاع */}
        <Link
          to={targetLink}
          className="block text-sm sm:text-base text-charcoal font-semibold leading-snug hover:text-gold transition-colors line-clamp-2 min-h-[40px] sm:min-h-[48px] break-words"
        >
          {name}
        </Link>

        {/* ====== السعر + العداد + الزر مثبتان أسفل البطاقة ====== */}
        <div className="mt-auto space-y-2">
          {type === 'auction' && !isAuctionEnded && (
            <CountdownTimer endDate={defaultAuctionEnd} />
          )}
          
          <div className="text-gold font-extrabold text-base sm:text-lg inline-flex items-center gap-1">
            {formatSAR(displayPrice, i18n.language === 'ar' ? 'ar-SA' : 'en-US')} <SARIcon />
          </div>

          {type === 'auction' ? (
            <Link
              to={targetLink}
              aria-label={isAuctionEnded ? t('auction.ended') : t('auction.bidNow')}
              className={`h-10 sm:h-11 w-full rounded-luxury font-semibold transition flex items-center justify-center gap-2 min-h-[40px] sm:min-h-[44px] text-sm sm:text-base ${
                isAuctionEnded
                  ? 'bg-sand text-charcoal/70 cursor-not-allowed'
                  : 'bg-gold text-charcoal hover:bg-gold-hover'
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M9 6h6M9 18h6" />
              </svg>
              <span>{isAuctionEnded ? t('auction.ended') : t('auction.bidNow')}</span>
            </Link>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={isAuctionEnded || isOutOfStock}
              className={`h-10 sm:h-11 w-full rounded-luxury font-semibold transition flex items-center justify-center gap-2 min-h-[40px] sm:min-h-[44px] text-sm sm:text-base ${
                isAuctionEnded || isOutOfStock
                  ? 'bg-sand text-charcoal/70 cursor-not-allowed'
                  : 'bg-gold text-charcoal hover:bg-gold-hover'
              }`}
              aria-label={t('common.addToCart')}
            >
              <span>
                {isOutOfStock ? t('products.outOfStock') : t('common.addToCart')}
              </span>
              {isOutOfStock ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 9l6 6M15 9l-6 6" />
                  <circle cx="12" cy="12" r="9" strokeWidth="2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 6h15l-1.5 9H7.5L6 6zM7 6V4a3 3 0 016 0v2" />
                </svg>
              )}
            </button>
          )}
        </div>
        {/* ============================================ */}
      </div>
    </article>
  );
}
