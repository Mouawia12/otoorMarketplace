import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import { formatPrice } from '../utils/currency';

interface ModerationItem {
  id: number;
  type: 'product' | 'auction' | 'dispute' | 'auth_request';
  title: string;
  titleAr: string;
  date: string;
  priority: 'low' | 'medium' | 'high';
}

export default function AdminDashboardPage() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const [kpis, setKpis] = useState({ totalUsers: 0, pendingProducts: 0, activeAuctions: 0, openDisputes: 0, authRequests: 0, revenue: 0 });
  const [queue, setQueue] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setKpis({
      totalUsers: 1247,
      pendingProducts: 8,
      activeAuctions: 5,
      openDisputes: 3,
      authRequests: 12,
      revenue: 45230.50
    });

    setQueue([
      { id: 1, type: 'product', title: 'Tom Ford Oud Wood', titleAr: 'توم فورد أود وود', date: '2024-10-05', priority: 'high' },
      { id: 2, type: 'auth_request', title: 'Seller verification - Ahmed', titleAr: 'توثيق بائع - أحمد', date: '2024-10-05', priority: 'high' },
      { id: 3, type: 'dispute', title: 'Order 1023 dispute', titleAr: 'نزاع طلب 1023', date: '2024-10-04', priority: 'medium' },
      { id: 4, type: 'auction', title: 'Creed Aventus auction', titleAr: 'مزاد كريد أفينتوس', date: '2024-10-04', priority: 'low' },
    ]);
    
    setLoading(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-gold bg-gold bg-opacity-10';
      case 'low': return 'text-gray-600 bg-gray-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return <div className="text-center py-12"><p className="text-taupe">{t('common.loading')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <h1 className="text-h2 text-charcoal mb-2">{t('admin.dashboard')}</h1>
        <p className="text-taupe">{t('admin.systemOverview')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-luxury p-6 shadow-luxury">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">👥</span>
            <h3 className="text-sm text-taupe">{t('admin.totalUsers')}</h3>
          </div>
          <p className="text-3xl font-bold text-charcoal">{kpis.totalUsers}</p>
        </div>

        <div className="bg-white rounded-luxury p-6 shadow-luxury">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🛍️</span>
            <h3 className="text-sm text-taupe">{t('admin.pendingProducts')}</h3>
          </div>
          <p className="text-3xl font-bold text-gold">{kpis.pendingProducts}</p>
        </div>

        <div className="bg-white rounded-luxury p-6 shadow-luxury">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🔨</span>
            <h3 className="text-sm text-taupe">{t('admin.activeAuctions')}</h3>
          </div>
          <p className="text-3xl font-bold text-charcoal">{kpis.activeAuctions}</p>
        </div>

        <div className="bg-white rounded-luxury p-6 shadow-luxury">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-sm text-taupe">{t('admin.openDisputes')}</h3>
          </div>
          <p className="text-3xl font-bold text-red-600">{kpis.openDisputes}</p>
        </div>

        <div className="bg-white rounded-luxury p-6 shadow-luxury">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">✅</span>
            <h3 className="text-sm text-taupe">{t('admin.authRequests')}</h3>
          </div>
          <p className="text-3xl font-bold text-gold">{kpis.authRequests}</p>
        </div>

        <div className="bg-gradient-to-br from-gold to-gold-hover rounded-luxury p-6 shadow-luxury">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💰</span>
            <h3 className="text-sm text-charcoal">{t('admin.totalRevenue')}</h3>
          </div>
          <p className="text-3xl font-bold text-charcoal">{formatPrice(kpis.revenue, language)}</p>
        </div>
      </div>

      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <h2 className="text-h3 text-charcoal mb-4">{t('admin.moderationQueue')}</h2>
        <div className="space-y-3">
          {queue.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-luxury hover:border-gold transition">
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(item.priority)}`}>
                  {t(`admin.${item.priority}`)}
                </span>
                <div>
                  <p className="text-charcoal font-medium">{i18n.language === 'ar' ? item.titleAr : item.title}</p>
                  <p className="text-sm text-taupe">{new Date(item.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                </div>
              </div>
              <Link to={`/admin/${item.type === 'auth_request' ? 'auth-requests' : item.type}s`} className="text-gold hover:text-gold-hover font-semibold">
                {t('admin.review')} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
