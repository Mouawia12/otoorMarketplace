import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import api from '../lib/api';
import { Auction, Bid } from '../types';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { formatPrice } from '../utils/currency';

export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [_ws, setWs] = useState<WebSocket | null>(null);
  const [timeLeft, setTimeLeft] = useState('');

  const { register, handleSubmit, formState: { isSubmitting }, reset } = useForm<{ amount: number }>();

  const fetchAuction = useCallback(async () => {
    try {
      const response = await api.get(`/auctions/${id}`);
      setAuction(response.data);
    } catch (error) {
      console.error('Failed to fetch auction:', error);
    }
  }, [id]);

  const fetchBids = useCallback(async () => {
    try {
      const response = await api.get(`/auctions/${id}/bids`);
      setBids(response.data);
    } catch (error) {
      console.error('Failed to fetch bids:', error);
    }
  }, [id]);

  useEffect(() => {
    const loadData = async () => {
      await fetchAuction();
      await fetchBids();
      setLoading(false);
    };
    loadData();
  }, [fetchAuction, fetchBids]);

  useEffect(() => {
    if (!auction) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(auction.end_time).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft(t('auctions.ended'));
        clearInterval(timer);
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [auction, t]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/auctions/${id}/ws`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'bid') {
        setAuction(prev => prev ? { ...prev, current_price: data.current_price } : null);
        fetchBids();
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [id, isAuthenticated, fetchBids]);

  const onSubmitBid = async (data: { amount: number }) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      await api.post(`/auctions/${id}/bid`, { amount: data.amount });
      reset();
      await fetchAuction();
      await fetchBids();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to place bid');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-charcoal-light">{t('common.loading')}</p>
      </div>
    );
  }

  if (!auction) {
    return null;
  }

  const product = auction.product;
  const name = product ? (language === 'ar' ? product.name_ar : product.name_en) : 'Unknown Product';
  const description = product ? (language === 'ar' ? product.description_ar : product.description_en) : '';
  const imageUrl = product?.image_urls?.[0] || '/images/placeholder-perfume.svg';
  const isActive = auction.status === 'running' && new Date(auction.end_time) > new Date();
  const minBidAmount = auction.current_price + auction.minimum_increment;

  return (
    <div>
      <button
        onClick={() => navigate('/auctions')}
        className="mb-6 text-gold hover:text-gold-light transition"
      >
        ← {t('common.back')}
      </button>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <div className="bg-ivory rounded-luxury overflow-hidden aspect-square">
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-perfume.jpg';
              }}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-luxury shadow-luxury">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-3xl font-bold text-charcoal">{name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {isActive ? 'LIVE' : auction.status.toUpperCase()}
              </span>
            </div>

            <p className="text-charcoal-light mb-6">{description}</p>

            <div className="space-y-3 border-t border-b border-gray-200 py-4 mb-6">
              <div className="flex justify-between">
                <span className="text-charcoal-light">{t('auctions.currentBid')}:</span>
                <span className="text-2xl font-bold text-gold">
                  {formatPrice(auction.current_price, language)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-light">{t('auctions.startingPrice')}:</span>
                <span className="text-charcoal font-semibold">
                  {formatPrice(auction.starting_price, language)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-light">{t('auctions.timeRemaining')}:</span>
                <span className="text-charcoal font-semibold">{timeLeft}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-light">Total Bids:</span>
                <span className="text-charcoal font-semibold">{bids.length}</span>
              </div>
            </div>

            {isActive && isAuthenticated && (
              <form onSubmit={handleSubmit(onSubmitBid)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    {t('auctions.yourBid')} (Min: {formatPrice(minBidAmount, language)})
                  </label>
                  <input
                    {...register('amount', { 
                      required: true,
                      min: minBidAmount,
                      valueAsNumber: true
                    })}
                    type="number"
                    step="0.01"
                    min={minBidAmount}
                    className="w-full px-4 py-2 border border-gray-300 rounded-luxury focus:ring-2 focus:ring-gold focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gold text-charcoal font-semibold py-3 rounded-luxury hover:bg-gold-light transition disabled:opacity-50"
                >
                  {isSubmitting ? t('common.loading') : t('auctions.placeBid')}
                </button>
              </form>
            )}

            {!isAuthenticated && isActive && (
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gold text-charcoal font-semibold py-3 rounded-luxury hover:bg-gold-light transition"
              >
                {t('common.login')} to Bid
              </button>
            )}
          </div>

          <div className="bg-white p-6 rounded-luxury shadow-luxury">
            <h3 className="text-xl font-bold text-charcoal mb-4">Bid History</h3>
            {bids.length === 0 ? (
              <p className="text-charcoal-light text-center py-4">No bids yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {bids.map(bid => (
                  <div key={bid.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-charcoal-light text-sm">
                      {bid.bidder?.full_name || 'Anonymous'}
                    </span>
                    <span className="font-semibold text-gold">{formatPrice(bid.amount, language)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
