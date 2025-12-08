import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { fetchAuctionById, fetchAuctionBids, placeBid } from '../services/auctionService';
import { Auction, Bid, Product } from '../types';
import { formatPrice } from '../utils/currency';
import { resolveImageUrl } from '../utils/image';
import { PLACEHOLDER_PERFUME } from '../utils/staticAssets';
import Countdown from '../components/common/Countdown';
import ProductImageCarousel from '../components/products/ProductImageCarousel';
import { getAuctionRealtimeSocket, type AuctionRealtimePayload } from '../lib/realtime';

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
  const [liveStatus, setLiveStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const obfuscateName = useCallback(
    (fullName?: string, email?: string, fallbackId?: number) => {
      const safeName = fullName?.trim();
      if (safeName && safeName.length >= 2) {
        const first = safeName[0];
        const last = safeName[safeName.length - 1];
        return `${first}***${last}`;
      }

      if (email && email.includes('@')) {
        const [user, domain] = email.split('@');
        const safeUser = user ? `${user[0]}***` : '***';
        const safeDomain = domain ? `${domain[0]}***` : '***';
        return `${safeUser}@${safeDomain}`;
      }

      return t('auction.participantLabel', { id: fallbackId ?? '***' });
    },
    [t]
  );

  const mapBidErrorMessage = useCallback(
    (detail?: string) => {
      if (!detail) {
        return t('common.error');
      }
      const normalized = detail.toLowerCase();
      if (normalized.includes('auction has ended') || normalized.includes('auction is not active')) {
        return t('auction.ended');
      }
      if (normalized.includes('bid must be at least')) {
        return t('auction.bidRejected');
      }
      return detail;
    },
    [t]
  );

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
    if (!id) {
      return;
    }

    const numericId = parseInt(id, 10);
    if (Number.isNaN(numericId)) {
      return;
    }

    const socket = getAuctionRealtimeSocket();

    const joinRoom = () => {
      socket.emit('auction:join', numericId);
    };

    const handleConnect = () => {
      setLiveStatus('connected');
      joinRoom();
    };

    const handleDisconnect = () => {
      setLiveStatus('disconnected');
    };

    const handleUpdate = (payload: AuctionRealtimePayload) => {
      if (payload.auctionId !== numericId) {
        return;
      }
      setAuction((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          current_price: payload.currentPrice,
          total_bids: payload.totalBids,
        };
      });
      setBids((prev) => {
        const filtered = prev.filter((bid) => bid.id !== payload.bid.id);
        return [payload.bid, ...filtered].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('auction:update', handleUpdate);

    if (socket.connected) {
      setLiveStatus('connected');
      joinRoom();
    } else {
      setLiveStatus('connecting');
    }

    return () => {
      socket.emit('auction:leave', numericId);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('auction:update', handleUpdate);
    };
  }, [id]);

  const participants = useMemo(() => {
    const map = new Map<number, { label: string; highest: number; count: number }>();
    bids.forEach((bid) => {
      if (!bid.bidder_id) return;
      const prev = map.get(bid.bidder_id);
      const label = prev?.label ?? obfuscateName(bid.bidder?.full_name, bid.bidder?.email, bid.bidder_id);
      const highest = prev ? Math.max(prev.highest, bid.amount) : bid.amount;
      const count = prev ? prev.count + 1 : 1;
      map.set(bid.bidder_id, { label, highest, count });
    });
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.highest - a.highest);
  }, [bids, obfuscateName]);

  const winner = useMemo(() => {
    if (!bids.length) return null;
    const topBid = [...bids].sort(
      (a, b) => b.amount - a.amount || new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
    return topBid
      ? {
          bid: topBid,
          label: obfuscateName(topBid.bidder?.full_name, topBid.bidder?.email, topBid.bidder_id),
        }
      : null;
  }, [bids, obfuscateName]);

  const minBidValue = auction ? auction.current_price + auction.minimum_increment : 0;
  const stepValue = auction?.minimum_increment ?? 1;

  useEffect(() => {
    if (!auction) return;
    setBidAmount(auction.current_price + auction.minimum_increment);
  }, [auction?.current_price, auction?.minimum_increment]);

  const handleBidSubmit = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!auction) return;

    if (new Date(auction.end_time).getTime() <= Date.now()) {
      setBidError(t('auction.ended'));
      return;
    }

    if (bidAmount < minBidValue) {
      setBidError(t('auction.minBid') + ': ' + formatPrice(minBidValue, language));
      return;
    }

    setBidError('');
    setSubmitting(true);

    try {
      await placeBid(auction.id, bidAmount);
      if (liveStatus !== 'connected') {
        const updatedAuction = await loadAuction();
        if (updatedAuction) {
          setBidAmount(updatedAuction.current_price + updatedAuction.minimum_increment);
        }
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail ?? error?.message;
      setBidError(mapBidErrorMessage(detail));
    } finally {
      setSubmitting(false);
    }
  };

  const incrementBid = () => {
    if (!auction) return;
    setBidError('');
    setBidAmount((prev) => {
      const base = Number.isFinite(prev) && prev >= minBidValue ? prev : minBidValue;
      return base + stepValue;
    });
  };

  const decrementBid = () => {
    if (!auction) return;
    setBidError('');
    setBidAmount((prev) => {
      const base = Number.isFinite(prev) && prev > minBidValue ? prev : minBidValue;
      return Math.max(minBidValue, base - stepValue);
    });
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
  const resolvedImages =
    (product.image_urls || [])
      .map((img) => resolveImageUrl(img) || '')
      .filter(Boolean);
  const images = resolvedImages.length ? resolvedImages : [PLACEHOLDER_PERFUME];
  const isEnded = new Date(auction.end_time).getTime() < new Date().getTime();
  const seller = auction.seller || { id: 0, full_name: 'Unknown', verified_seller: false };
  const liveBadgeTone =
    liveStatus === 'connected'
      ? 'bg-green-100 text-green-800'
      : liveStatus === 'connecting'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-red-100 text-red-700';
  const liveDotTone =
    liveStatus === 'connected'
      ? 'bg-green-500'
      : liveStatus === 'connecting'
        ? 'bg-amber-500'
        : 'bg-red-500';
  return (
    <div className="space-y-12">
      {/* Status Badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="inline-block bg-gold text-charcoal px-4 py-1 rounded-luxury text-sm font-semibold">
          {t('catalog.auction')}
        </span>
        {product.condition && (
          <span className="text-sm text-taupe">
            {product.condition === 'new' ? t('catalog.new') : t('catalog.used')}
          </span>
        )}
        {!isEnded && (
          <span className={`inline-flex items-center gap-2 px-4 py-1 rounded-luxury text-xs font-semibold ${liveBadgeTone}`}>
            <span className={`h-2 w-2 rounded-full ${liveDotTone}`} />
            {t('auction.liveBadge')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ProductImageCarousel
          images={images}
          name={name}
          fallback={PLACEHOLDER_PERFUME}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        />

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
              <div className="flex items-center gap-2 text-xs text-taupe mt-3">
                <span className={`h-2 w-2 rounded-full ${liveDotTone}`} />
                <span>
                  {liveStatus === 'connected'
                    ? t('auction.liveConnected')
                    : liveStatus === 'connecting'
                      ? t('auction.liveConnecting')
                      : t('auction.liveDisconnected')}
                </span>
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
                    min={minBidValue}
                    step={stepValue}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setBidError('');
                      setBidAmount(Number.isNaN(next) ? 0 : next);
                    }}
                    onBlur={() => {
                      setBidAmount((prev) => Math.max(minBidValue, prev || minBidValue));
                    }}
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
      <div className="border-t border-gray-200 pt-12">
        <h2 className="text-h2 text-charcoal mb-6">{t('auction.bidHistory')}</h2>
        
        <div className="bg-white rounded-luxury shadow-luxury overflow-hidden">
          {bids.length === 0 ? (
            <div className="py-8 text-center text-taupe text-sm">{t('auction.noBids')}</div>
          ) : (
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
                  {bids.map((bid) => {
                    const maskedName = obfuscateName(bid.bidder?.full_name, bid.bidder?.email, bid.bidder_id);
                    const isWinnerRow = winner?.bid.id === bid.id;
                    return (
                      <tr key={bid.id} className={`border-b border-gray-100 ${isWinnerRow ? 'bg-gold/10' : ''}`}>
                        <td className="py-3 px-4 text-charcoal">
                          {maskedName}
                          {isWinnerRow && (
                            <span className="ms-2 text-xs bg-gold text-charcoal px-2 py-1 rounded-full font-semibold">
                              {isEnded ? t('auction.winner') : t('auction.leadingBidder')}
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
          )}
        </div>
      </div>

      {/* Participants & Winner */}
      {bids.length > 0 && (
        <div className="bg-white rounded-luxury shadow-luxury p-5 space-y-4">
          {winner && (
            <div className="p-4 rounded-xl border border-gold/60 bg-gold/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs text-taupe uppercase tracking-wide">
                  {isEnded ? t('auction.winner') : t('auction.leadingBidder')}
                </p>
                <p className="text-lg font-bold text-charcoal">{winner.label}</p>
              </div>
              <div className="text-xl font-extrabold text-gold">
                {formatPrice(winner.bid.amount, language)}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-charcoal">{t('auction.participants')}</h3>
            <span className="text-xs text-taupe">{t('auction.privacyNote')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {participants.map((participant) => (
              <div key={participant.id} className="border border-sand/60 rounded-xl p-3 bg-ivory/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{participant.label}</p>
                    <p className="text-xs text-taupe">
                      {t('auction.bidsCount', { count: participant.count })}
                    </p>
                  </div>
                  <span className="text-gold font-bold">
                    {formatPrice(participant.highest, language)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
