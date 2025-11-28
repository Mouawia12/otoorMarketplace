import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import { formatPrice } from '../utils/currency';
import SARIcon from '../components/common/SARIcon';
import api from '../lib/api';

interface DashboardStats {
  totalSales: number;
  activeProducts: number;
  activeAuctions: number;
  pendingOrders: number;
  totalEarnings: number;
  monthlyEarnings: number;
}

export default function SellerDashboardPage() {
  const { t } = useTranslation();
  const { language } = useUIStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await api.get('/seller/dashboard');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to load seller stats', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.loading')}</p>
      </div>
    );
  }

  const kpiCards = [
    {
      label: t('seller.totalSales'),
      value: stats.totalSales,
      icon: '📈',
      color: 'bg-blue-50',
      link: '/seller/orders',
    },
    {
      label: t('seller.activeProducts'),
      value: stats.activeProducts,
      icon: '🛍️',
      color: 'bg-green-50',
      link: '/seller/products',
    },
    {
      label: t('seller.activeAuctions'),
      value: stats.activeAuctions,
      icon: '🔨',
      color: 'bg-purple-50',
      link: '/seller/auctions',
    },
    {
      label: t('seller.pendingOrders'),
      value: stats.pendingOrders,
      icon: '📦',
      color: 'bg-gold bg-opacity-20',
      link: '/seller/orders',
    },
  ];

  const renderPrice = (value: number, size = 18, className = '') => {
    const formatted = formatPrice(value, language).replace(/\s?(SAR|﷼)$/i, '');
    return (
      <span className={`inline-flex items-center gap-1 ${className}`.trim()}>
        {formatted}
        <SARIcon size={size} />
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <h1 className="text-h2 text-charcoal mb-2">{t('seller.dashboard')}</h1>
        <p className="text-taupe">{t('seller.welcomeMessage')}</p>
      </div>

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-gold to-gold-hover rounded-luxury p-6 shadow-luxury text-charcoal">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">💰</span>
            <h3 className="text-h3">{t('seller.totalEarnings')}</h3>
          </div>
        <p className="text-4xl font-bold">{renderPrice(stats.totalEarnings, 22)}</p>
        <Link to="/seller/earnings" className="text-sm underline mt-2 inline-block hover:text-charcoal-light">
          {t('seller.viewDetails')}
        </Link>
      </div>

        <div className="bg-white rounded-luxury p-6 shadow-luxury">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📅</span>
            <h3 className="text-h3 text-charcoal">{t('seller.monthlyEarnings')}</h3>
          </div>
          <p className="text-4xl font-bold text-charcoal">{renderPrice(stats.monthlyEarnings, 22)}</p>
          <p className="text-sm text-taupe mt-2">{t('seller.thisMonth')}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, index) => (
          <Link
            key={index}
            to={card.link}
            className="bg-white rounded-luxury p-6 shadow-luxury hover:shadow-luxury-hover transition"
          >
            <div className={`w-12 h-12 ${card.color} rounded-luxury flex items-center justify-center mb-4`}>
              <span className="text-2xl">{card.icon}</span>
            </div>
            <p className="text-3xl font-bold text-charcoal mb-1">{card.value}</p>
            <p className="text-taupe text-sm">{card.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
