import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import { formatPrice } from '../utils/currency';

interface Auction {
  id: number;
  productName: string;
  productNameAr: string;
  startDate: string;
  endDate: string;
  startingPrice: number;
  currentBid: number;
  totalBids: number;
  status: 'active' | 'ended' | 'upcoming';
}

export default function SellerAuctionsPage() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockAuctions: Auction[] = [
      {
        id: 1,
        productName: 'Chanel No 5 - Rare Edition',
        productNameAr: 'شانيل رقم 5 - إصدار نادر',
        startDate: '2024-10-01T10:00:00Z',
        endDate: '2024-10-10T22:00:00Z',
        startingPrice: 200.00,
        currentBid: 385.00,
        totalBids: 24,
        status: 'active',
      },
      {
        id: 2,
        productName: 'Tom Ford Oud Wood Limited',
        productNameAr: 'توم فورد أود وود محدود',
        startDate: '2024-09-25T12:00:00Z',
        endDate: '2024-09-30T20:00:00Z',
        startingPrice: 300.00,
        currentBid: 520.00,
        totalBids: 38,
        status: 'ended',
      },
      {
        id: 3,
        productName: 'Creed Royal Oud',
        productNameAr: 'كريد رويال عود',
        startDate: '2024-10-15T14:00:00Z',
        endDate: '2024-10-25T18:00:00Z',
        startingPrice: 250.00,
        currentBid: 0,
        totalBids: 0,
        status: 'upcoming',
      },
      {
        id: 4,
        productName: 'Dior Sauvage Elixir',
        productNameAr: 'ديور سوفاج إليكسير',
        startDate: '2024-10-02T08:00:00Z',
        endDate: '2024-10-12T16:00:00Z',
        startingPrice: 180.00,
        currentBid: 295.00,
        totalBids: 17,
        status: 'active',
      },
      {
        id: 5,
        productName: 'Yves Saint Laurent La Nuit',
        productNameAr: 'إيف سان لوران لا نويت',
        startDate: '2024-09-20T10:00:00Z',
        endDate: '2024-09-28T22:00:00Z',
        startingPrice: 150.00,
        currentBid: 275.00,
        totalBids: 31,
        status: 'ended',
      },
    ];

    setAuctions(mockAuctions);
    setLoading(false);
  };

  const filteredAuctions = filter === 'all'
    ? auctions
    : auctions.filter(a => a.status === filter);

  const getStatusColor = (status: Auction['status']) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'ended': return 'text-gray-600 bg-gray-200';
      case 'upcoming': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
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
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-h2 text-charcoal">{t('seller.auctions')}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-luxury text-sm font-semibold transition ${
                filter === 'all' ? 'bg-gold text-charcoal' : 'bg-sand text-charcoal-light'
              }`}
            >
              {t('seller.allAuctions')}
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-luxury text-sm font-semibold transition ${
                filter === 'active' ? 'bg-gold text-charcoal' : 'bg-sand text-charcoal-light'
              }`}
            >
              {t('seller.active')}
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-luxury text-sm font-semibold transition ${
                filter === 'upcoming' ? 'bg-gold text-charcoal' : 'bg-sand text-charcoal-light'
              }`}
            >
              {t('seller.upcoming')}
            </button>
            <button
              onClick={() => setFilter('ended')}
              className={`px-4 py-2 rounded-luxury text-sm font-semibold transition ${
                filter === 'ended' ? 'bg-gold text-charcoal' : 'bg-sand text-charcoal-light'
              }`}
            >
              {t('seller.ended')}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.id')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.product')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.startDate')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.endDate')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.startingPrice')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.currentBid')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.totalBids')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.status')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuctions.map((auction) => (
                <tr key={auction.id} className="border-b border-gray-100 hover:bg-sand transition">
                  <td className="px-4 py-4 text-charcoal-light">{auction.id}</td>
                  <td className="px-4 py-4 text-charcoal font-medium">
                    {i18n.language === 'ar' ? auction.productNameAr : auction.productName}
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">
                    {new Date(auction.startDate).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">
                    {new Date(auction.endDate).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">{formatPrice(auction.startingPrice, language)}</td>
                  <td className="px-4 py-4 text-charcoal font-semibold">
                    {auction.currentBid > 0 ? formatPrice(auction.currentBid, language) : '-'}
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">{auction.totalBids}</td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(auction.status)}`}>
                      {t(`seller.${auction.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      to={`/auction/${auction.id}`}
                      className="text-gold hover:text-gold-hover text-sm font-semibold"
                    >
                      {t('seller.view')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAuctions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-taupe">{t('seller.noAuctions')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
