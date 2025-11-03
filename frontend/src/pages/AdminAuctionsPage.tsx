import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Auction {
  id: number;
  product: string;
  productAr: string;
  endDate: string;
  currentBid: number;
  totalBids: number;
  status: 'running' | 'scheduled' | 'ended';
}

interface Bid {
  id: number;
  bidder: string;
  amount: number;
  time: string;
}

export default function AdminAuctionsPage() {
  const { t, i18n } = useTranslation();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showBidLog, setShowBidLog] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidLog, setBidLog] = useState<Bid[]>([]);

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setAuctions([
      { id: 1, product: 'Tom Ford Oud Wood', productAr: 'توم فورد أود وود', endDate: '2024-10-10T22:00:00Z', currentBid: 385, totalBids: 24, status: 'running' },
      { id: 2, product: 'Creed Royal Oud', productAr: 'كريد رويال عود', endDate: '2024-10-15T18:00:00Z', currentBid: 0, totalBids: 0, status: 'scheduled' },
      { id: 3, product: 'Dior Sauvage Elixir', productAr: 'ديور سوفاج إليكسير', endDate: '2024-09-30T20:00:00Z', currentBid: 520, totalBids: 38, status: 'ended' },
    ]);
    setLoading(false);
  };

  const handleViewBids = async (auction: Auction) => {
    setSelectedAuction(auction);
    await new Promise(resolve => setTimeout(resolve, 300));
    setBidLog([
      { id: 1, bidder: 'Ahmed M.', amount: 385, time: '2024-10-05T10:30:00Z' },
      { id: 2, bidder: 'Fatima A.', amount: 370, time: '2024-10-05T09:15:00Z' },
      { id: 3, bidder: 'Omar H.', amount: 350, time: '2024-10-04T22:45:00Z' },
    ]);
    setShowBidLog(true);
  };

  const handleExtend = (id: number) => {
    if (window.confirm(t('admin.confirmExtend'))) {
      setAuctions(auctions.map(a => a.id === id ? { ...a, endDate: new Date(new Date(a.endDate).getTime() + 24*60*60*1000).toISOString() } : a));
    }
  };

  const handleEnd = (id: number) => {
    if (window.confirm(t('admin.confirmEnd'))) {
      setAuctions(auctions.map(a => a.id === id ? { ...a, status: 'ended' as const } : a));
    }
  };

  const filtered = filter === 'all' ? auctions : auctions.filter(a => a.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'ended': return 'text-gray-600 bg-gray-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return <div className="text-center py-12"><p className="text-taupe">{t('common.loading')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <h1 className="text-h2 text-charcoal mb-6">{t('admin.auctions')}</h1>

        <div className="flex gap-2 mb-6">
          {['all', 'running', 'scheduled', 'ended'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-luxury text-sm font-semibold ${filter === s ? 'bg-gold text-charcoal' : 'bg-sand text-charcoal-light'}`}>
              {t(`admin.${s}`)}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.id')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.product')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.endDate')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.currentBid')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.totalBids')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.status')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-sand">
                  <td className="px-4 py-4 text-charcoal-light">{a.id}</td>
                  <td className="px-4 py-4 text-charcoal font-medium">{i18n.language === 'ar' ? a.productAr : a.product}</td>
                  <td className="px-4 py-4 text-charcoal-light">{new Date(a.endDate).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                  <td className="px-4 py-4 text-charcoal font-semibold">{a.currentBid > 0 ? `${a.currentBid} ريال` : '-'}</td>
                  <td className="px-4 py-4 text-charcoal-light">{a.totalBids}</td>
                  <td className="px-4 py-4"><span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(a.status)}`}>{t(`admin.${a.status}`)}</span></td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleViewBids(a)} className="text-blue-600 hover:text-blue-700 text-sm font-semibold">{t('admin.viewBids')}</button>
                      {a.status === 'running' && (
                        <>
                          <button onClick={() => handleExtend(a.id)} className="text-gold hover:text-gold-hover text-sm font-semibold">{t('admin.extend')}</button>
                          <button onClick={() => handleEnd(a.id)} className="text-red-600 hover:text-red-700 text-sm font-semibold">{t('admin.end')}</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showBidLog && selectedAuction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-luxury p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-h3 text-charcoal mb-4">{t('admin.bidLog')} - {i18n.language === 'ar' ? selectedAuction.productAr : selectedAuction.product}</h3>
            <div className="space-y-3">
              {bidLog.map((bid) => (
                <div key={bid.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-luxury">
                  <div>
                    <p className="text-charcoal font-medium">{bid.bidder}</p>
                    <p className="text-sm text-taupe">{new Date(bid.time).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                  </div>
                  <p className="text-xl font-bold text-gold">{bid.amount} ريال</p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowBidLog(false)} className="mt-4 w-full bg-sand text-charcoal px-6 py-3 rounded-luxury font-semibold">{t('common.close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
