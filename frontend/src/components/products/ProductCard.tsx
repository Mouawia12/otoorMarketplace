import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Product } from '../../types';
import { useUIStore } from '../../store/uiStore';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import SARIcon from '../common/SARIcon';
import { formatSAR } from '../../utils/currency';
import CountdownTimer from '../auctions/CountdownTimer';

interface ProductCardProps {
  product: Product;
  type?: 'new' | 'used' | 'auction';
  currentBid?: number;
  auctionEndDate?: string;
}

function productLink(p: Product) {
  return `/p/${p.id}`;
}

export default function ProductCard({ product, type = 'new', currentBid, auctionEndDate }: ProductCardProps) {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

  const addToCart = useCartStore((s) => s.add);
  const hasInWishlist = useWishlistStore((s) => s.has(product.id.toString()));
  const addToWishlist = useWishlistStore((s) => s.add);
  const removeFromWishlist = useWishlistStore((s) => s.remove);

  const name = language === 'ar' ? product.name_ar : product.name_en;
  const imageUrl = product.image_urls?.[0] || 'https://via.placeholder.com/300x400?text=Perfume';
  const displayPrice = type === 'auction' && currentBid ? currentBid : product.base_price;
  
  const defaultAuctionEnd = auctionEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const toggleWishlist = () => {
    if (hasInWishlist) {
      removeFromWishlist(product.id.toString());
    } else {
      addToWishlist({
        id: product.id.toString(),
        name,
        price: displayPrice,
        image: imageUrl,
        brand: product.brand,
      });
    }
  };

  const handleAddToCart = () => {
    addToCart(
      {
        id: product.id.toString(),
        name,
        price: displayPrice,
        image: imageUrl,
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
        <Link to={productLink(product)} className="block aspect-[4/5] w-full bg-sand/60 overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>

        {/* المفضلة */}
        <button
          onClick={toggleWishlist}
          aria-label={hasInWishlist ? t('wishlist.remove') : 'Add to wishlist'}
          className="absolute top-2 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center bg-white/85 hover:bg-white shadow-md"
          style={{ insetInlineStart: '8px' }}
        >
          <svg
            className="w-5 h-5"
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
      <div className="p-4 flex-1 flex flex-col">
        {product.brand && (
          <div className="text-xs text-taupe/90 mb-1">{product.brand}</div>
        )}

        {/* عنوان بسطرين ثابتين لثبات الارتفاع */}
        <Link
          to={productLink(product)}
          className="block text-charcoal font-semibold leading-snug hover:text-gold transition-colors line-clamp-2 min-h-[44px]"
        >
          {name}
        </Link>

        {/* ====== السعر + العداد + الزر مثبتان أسفل البطاقة ====== */}
        <div className="mt-auto space-y-2">
          {type === 'auction' && (
            <CountdownTimer endDate={defaultAuctionEnd} />
          )}
          
          <div className="text-gold font-extrabold text-lg inline-flex items-center gap-1">
            {formatSAR(displayPrice, i18n.language === 'ar' ? 'ar-SA' : 'en-US')} <SARIcon />
          </div>

          <button
            onClick={handleAddToCart}
            className="h-11 w-full rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition flex items-center justify-center gap-2 min-h-[44px]"
            aria-label={t('common.addToCart')}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 6h15l-1.5 9H7.5L6 6zM7 6V4a3 3 0 016 0v2" />
            </svg>
            <span>{t('common.addToCart')}</span>
          </button>
        </div>
        {/* ============================================ */}
      </div>
    </article>
  );
}
