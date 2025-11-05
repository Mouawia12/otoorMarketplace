import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useUIStore } from '../store/uiStore';
import { formatPrice } from '../utils/currency';
import { fetchAuctions } from '../services/auctionService';

interface Bid {
  id: number;
  auctionId: number;
  auctionName: string;
  auctionNameAr: string;
  yourMaxBid: number;
  currentPrice: number;
  status: 'winning' | 'outbid' | 'ended_won' | 'ended_lost';
  endTime: string;
}

export default function BidsPage() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuctions = async () => {
      try {
        setLoading(true);
        const auctions = await fetchAuctions();
        const mapped: Bid[] = auctions.map((auction) => ({
          id: auction.id,
          auctionId: auction.id,
          auctionName: auction.product?.name_en ?? `Auction #${auction.id}`,
          auctionNameAr: auction.product?.name_ar ?? `مزاد #${auction.id}`,
          yourMaxBid: auction.current_price,
          currentPrice: auction.current_price,
          status:
            auction.status === 'active'
              ? 'winning'
              : auction.status === 'completed'
                ? 'ended_won'
                : 'ended_lost',
          endTime: auction.end_time,
        }));
        setBids(mapped);
      } catch (error) {
        console.error('Failed to load auctions', error);
        setBids([]);
      } finally {
        setLoading(false);
      }
    };

    loadAuctions();
  }, []);

  const getStatusBadge = (status: Bid['status']) => {
    switch (status) {
      case 'winning':
        return (
          <span className="px-3 py-1 rounded-full text-sm font-semibold text-green-600 bg-green-100">
            {t('bids.winning')}
          </span>
        );
      case 'outbid':
        return (
          <span className="px-3 py-1 rounded-full text-sm font-semibold text-red-600 bg-red-100">
            {t('bids.outbid')}
          </span>
        );
      case 'ended_won':
        return (
          <span className="px-3 py-1 rounded-full text-sm font-semibold text-green-700 bg-green-200">
            {t('bids.won')}
          </span>
        );
      case 'ended_lost':
        return (
          <span className="px-3 py-1 rounded-full text-sm font-semibold text-gray-600 bg-gray-200">
            {t('bids.lost')}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-luxury p-6 shadow-luxury">
      <h1 className="text-h2 text-charcoal mb-6">{t('account.bids')}</h1>

      {bids.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-taupe">{t('account.noBids')}</p>
          <Link
            to="/auctions"
            className="inline-block mt-4 bg-gold text-charcoal px-6 py-2 rounded-luxury font-semibold hover:bg-gold-hover transition"
          >
            {t('bids.browseAuctions')}
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">
                  {t('bids.auction')}
                </th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">
                  {t('bids.yourMaxBid')}
                </th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">
                  {t('bids.currentPrice')}
                </th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">
                  {t('bids.status')}
                </th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">
                  {t('bids.endTime')}
                </th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">
                  {t('bids.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {bids.map((bid) => (
                <tr key={bid.id} className="border-b border-gray-100 hover:bg-sand transition">
                  <td className="px-4 py-4 text-charcoal font-medium">
                    {t('lang') === 'ar' ? bid.auctionNameAr : bid.auctionName}
                  </td>
                  <td className="px-4 py-4 text-charcoal font-semibold">
                    {formatPrice(bid.yourMaxBid, language)}
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">
                    {formatPrice(bid.currentPrice, language)}
                  </td>
                  <td className="px-4 py-4">{getStatusBadge(bid.status)}</td>
                  <td className="px-4 py-4 text-charcoal-light">
                    {new Date(bid.endTime).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      to={`/auction/${bid.auctionId}`}
                      className="text-gold hover:text-gold-hover text-sm font-semibold"
                    >
                      {t('bids.viewAuction')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
