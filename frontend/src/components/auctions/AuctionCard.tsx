import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Auction } from '../../types';
import { resolveProductImageUrl } from '../../utils/image';
import { useUIStore } from '../../store/uiStore';
import { formatPrice } from '../../utils/currency';
import Countdown from '../common/Countdown';
import { PLACEHOLDER_PERFUME } from '../../utils/staticAssets';

interface AuctionCardProps {
  auction: Auction;
}

export default function AuctionCard({ auction }: AuctionCardProps) {
  const { t } = useTranslation();
  const { language } = useUIStore();

  const product = auction.product;
  const name = product ? (language === 'ar' ? product.name_ar : product.name_en) : 'Unknown Product';
  const imageUrl = resolveProductImageUrl(product?.image_urls?.[0]) || PLACEHOLDER_PERFUME;
  const isActive = auction.status === 'active';
  const bidsCount = auction.total_bids || 0;

  return (
    <div className="bg-white rounded-luxury overflow-hidden shadow-luxury hover:shadow-luxury-lg transition-all duration-300">
      <Link to={`/auction/${auction.id}`} className="block">
        <div className="aspect-square bg-ivory relative overflow-hidden">
          <img 
            src={imageUrl} 
            alt={name}
            className="w-full h-full object-contain bg-white"
            onError={(e) => {
              e.currentTarget.src = PLACEHOLDER_PERFUME;
            }}
          />
          <div className="absolute top-2 right-2 bg-gold text-charcoal px-3 py-1 rounded-full text-sm font-semibold">
            {isActive ? 'LIVE' : auction.status.toUpperCase()}
          </div>
        </div>
      </Link>
      
      <div className="p-4">
        <Link to={`/auction/${auction.id}`}>
          <h3 className="text-lg font-semibold text-charcoal mb-2 line-clamp-1 hover:text-gold transition">
            {name}
          </h3>
        </Link>
        
        <div className="space-y-2 mb-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-charcoal-light">{t('auction.currentBid')}:</span>
            <span className="text-xl font-bold text-gold">
              {formatPrice(auction.current_price, language)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-charcoal-light">{t('auction.timeRemaining')}:</span>
            <Countdown endAt={auction.end_time} compact className="text-sm font-semibold text-charcoal" />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-charcoal-light">
          <span>{bidsCount} {t('auction.bids')}</span>
          {product && <span>{product.brand}</span>}
        </div>
        
        <Link 
          to={`/auction/${auction.id}`}
          className="block mt-3 bg-gold text-charcoal text-center px-4 py-2 rounded-lg font-semibold hover:bg-gold-light transition"
        >
          {t('auction.viewAuction')}
        </Link>
      </div>
    </div>
  );
}
