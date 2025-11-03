import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Auction } from '../types';
import AuctionCard from '../components/auctions/AuctionCard';

export default function Auctions() {
  const { t } = useTranslation();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      const response = await api.get('/auctions', {
        params: { status: 'running' }
      });
      setAuctions(response.data);
    } catch (error) {
      console.error('Failed to fetch auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-charcoal mb-6">{t('auctions.title')}</h1>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">{t('common.loading')}</p>
        </div>
      ) : auctions.length === 0 ? (
        <div className="bg-white p-12 rounded-luxury shadow-luxury text-center">
          <p className="text-charcoal-light">No active auctions at the moment</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {auctions.map(auction => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </div>
  );
}
