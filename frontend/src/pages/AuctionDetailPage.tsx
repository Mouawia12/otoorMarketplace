import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { fetchAuctionById, fetchAuctionBids, placeBid } from '../services/auctionService';
import { Auction, Bid, Product } from '../types';
import { formatPrice } from '../utils/currency';
import { resolveImageUrl } from '../utils/image';
import Countdown from '../components/common/Countdown';

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState(0);
  const [bidError, setBidError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const loadAuction = useCallback(async () => {
    if (!id) return null;
    
    try {
      const auctionData = await fetchAuctionById(parseInt(id));
      setAuction(auctionData);
      setBidAmount(auctionData.current_price + auctionData.minimum_increment);
      
      const bidsData = await fetchAuctionBids(parseInt(id));
      setBids(bidsData);
      return auctionData;
    } catch (error) {
      console.error('Error loading auction:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAuction();
  }, [loadAuction]);

  useEffect(() => {
    if (!id) return;

    const pollInterval = setInterval(async () => {
      try {
        const auctionData = await fetchAuctionById(parseInt(id));
        setAuction(auctionData);
        
        const bidsData = await fetchAuctionBids(parseInt(id));
        setBids(bidsData);
      } catch (error) {
        console.error('Error polling auction:', error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [id]);

  const handleBidSubmit = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!auction) return;

    const minBid = auction.current_price + auction.minimum_increment;
    if (bidAmount < minBid) {
      setBidError(t('auction.minBid') + ': ' + formatPrice(minBid, language));
      return;
    }

    setBidError('');
    setSubmitting(true);

    try {
      await placeBid(auction.id, bidAmount);
      const updatedAuction = await loadAuction();
      if (updatedAuction) {
        setBidAmount(updatedAuction.current_price + updatedAuction.minimum_increment);
      }
    } catch (error: any) {
      setBidError(error.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const incrementBid = () => {
    if (!auction) return;
    setBidAmount(prev => prev + auction.minimum_increment);
  };

  const decrementBid = () => {
    if (!auction) return;
    const minBid = auction.current_price + auction.minimum_increment;
    setBidAmount(prev => Math.max(minBid, prev - auction.minimum_increment));
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.loading')}</p>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.notFound')}</p>
        <button
          onClick={() => navigate('/auctions')}
          className="mt-4 bg-gold text-charcoal px-6 py-2 rounded-luxury font-semibold hover:bg-gold-hover transition"
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  if (!auction.product) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.notFound')}</p>
        <button
          onClick={() => navigate('/auctions')}
          className="mt-4 bg-gold text-charcoal px-6 py-2 rounded-luxury font-semibold hover:bg-gold-hover transition"
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  const product: Product = auction.product;
  const name = language === 'ar' ? product.name_ar : product.name_en;
  const description = language === 'ar' ? product.description_ar : product.description_en;
  const images =
    (product.image_urls || [])
      .map((img) => resolveImageUrl(img) || '')
      .filter(Boolean);
  const isEnded = new Date(auction.end_time).getTime() < new Date().getTime();
  const seller = auction.seller || { id: 0, full_name: 'Unknown', verified_seller: false };

  return (
    <div className="space-y-12">
      {/* Status Badge */}
      <div className="flex items-center gap-3">
        <span className="inline-block bg-gold text-charcoal px-4 py-1 rounded-luxury text-sm font-semibold">
          {t('catalog.auction')}
        </span>
        {product.condition && (
          <span className="text-sm text-taupe">
            {product.condition === 'new' ? t('catalog.new') : t('catalog.used')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="bg-ivory rounded-luxury overflow-hidden aspect-square">
            <img
              src={images[selectedImage] || '/images/placeholder-perfume.svg'}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/images/placeholder-perfume.svg';
              }}
            />
          </div>
          
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-luxury overflow-hidden border-2 transition ${
                    selectedImage === index ? 'border-gold' : 'border-transparent'
                  }`}
                >
                  <img
                    src={img || '/images/placeholder-perfume.svg'}
                    alt={`${name} ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/images/placeholder-perfume.svg';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <p className="text-taupe text-sm mb-2">{product.brand}</p>
            <h1 className="text-h1 text-charcoal mb-4">{name}</h1>
            <p className="text-charcoal-light leading-relaxed">{description}</p>
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
              <span className="text-taupe">{t('auction.condition')}</span>
              <span className="text-charcoal font-semibold">
                {product.condition === 'new' ? t('catalog.new') : t('catalog.used')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-taupe">{t('auction.seller')}</span>
              <div className="flex items-center gap-2">
                <span className="text-charcoal font-semibold">{seller.full_name}</span>
                {seller.verified_seller && (
                  <span className="bg-success text-white text-xs px-2 py-1 rounded-full">
                    {t('auction.verifiedSeller')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Auction Box */}
          <div className="bg-sand rounded-luxury p-6">
            {/* Current Bid Display */}
            <div className="mb-6">
              <p className="text-sm text-taupe mb-1">{t('auction.currentBid')}</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-gold">{formatPrice(auction.current_price, language)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-taupe">{t('auction.totalBids')}: <span className="font-bold text-charcoal">{bids.length}</span></span>
                <Countdown 
                  startAt={auction.start_time}
                  endAt={auction.end_time} 
                  compact
                  className="text-charcoal font-bold"
                />
              </div>
            </div>

            {/* Bid Controls */}
            {!isEnded ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={decrementBid}
                    className="bg-charcoal-light text-ivory w-12 h-12 rounded-luxury font-bold hover:bg-charcoal transition"
                    aria-label="Decrease bid"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-luxury text-center text-xl font-bold focus:ring-2 focus:ring-gold focus:border-transparent"
                    aria-label={t('auction.bidAmount')}
                  />
                  <button
                    onClick={incrementBid}
                    className="bg-charcoal-light text-ivory w-12 h-12 rounded-luxury font-bold hover:bg-charcoal transition"
                    aria-label="Increase bid"
                  >
                    +
                  </button>
                </div>

                {bidError && (
                  <p className="text-alert text-sm">{bidError}</p>
                )}

                <button
                  onClick={handleBidSubmit}
                  disabled={submitting}
                  className="w-full bg-gold text-charcoal px-6 py-3 rounded-luxury font-semibold hover:bg-gold-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? t('common.loading') : t('auction.placeBid')}
                </button>

                <p className="text-xs text-taupe text-center">
                  {t('auction.minBid')}: {formatPrice(auction.current_price + auction.minimum_increment, language)}
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-alert font-semibold text-lg">{t('auction.ended')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bid History */}
      {bids.length > 0 && (
        <div className="border-t border-gray-200 pt-12">
          <h2 className="text-h2 text-charcoal mb-6">{t('auction.bidHistory')}</h2>
          
          <div className="bg-white rounded-luxury shadow-luxury overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-sand">
                  <tr className="border-b border-gray-200">
                    <th className="text-start py-3 px-4 text-charcoal font-semibold">{t('auction.seller')}</th>
                    <th className="text-start py-3 px-4 text-charcoal font-semibold">{t('auction.bidAmount')}</th>
                    <th className="text-start py-3 px-4 text-charcoal font-semibold">{t('common.time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map((bid, index) => {
                    const bidderName = bid.bidder?.full_name || 'Anonymous';
                    const maskedName = bidderName.charAt(0) + '***' + bidderName.charAt(bidderName.length - 1);
                    
                    return (
                      <tr key={bid.id} className={`border-b border-gray-100 ${index === 0 ? 'bg-gold bg-opacity-10' : ''}`}>
                        <td className="py-3 px-4 text-charcoal">
                          {maskedName}
                          {index === 0 && (
                            <span className="ms-2 text-xs bg-gold text-charcoal px-2 py-1 rounded-full font-semibold">
                              {t('home.live')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-gold">{formatPrice(bid.amount, language)}</td>
                        <td className="py-3 px-4 text-taupe text-sm">
                          {new Date(bid.created_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
