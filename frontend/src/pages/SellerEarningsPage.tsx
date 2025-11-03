import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { formatPrice } from '../utils/currency';

interface EarningsRecord {
  id: number;
  date: string;
  orderId: number;
  productName: string;
  productNameAr: string;
  amount: number;
  commission: number;
  netEarnings: number;
}

export default function SellerEarningsPage() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const [earnings, setEarnings] = useState<EarningsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalEarnings: 0,
    totalCommission: 0,
    netEarnings: 0,
    averageOrder: 0,
  });

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockEarnings: EarningsRecord[] = [
      { id: 1, date: '2024-10-05', orderId: 1001, productName: 'Chanel No 5', productNameAr: 'شانيل رقم 5', amount: 150.00, commission: 15.00, netEarnings: 135.00 },
      { id: 2, date: '2024-10-04', orderId: 1002, productName: 'Dior Sauvage', productNameAr: 'ديور سوفاج', amount: 120.00, commission: 12.00, netEarnings: 108.00 },
      { id: 3, date: '2024-10-03', orderId: 1003, productName: 'Tom Ford Oud Wood', productNameAr: 'توم فورد أود وود', amount: 280.00, commission: 28.00, netEarnings: 252.00 },
      { id: 4, date: '2024-10-01', orderId: 1004, productName: 'Creed Aventus', productNameAr: 'كريد أفينتوس', amount: 350.00, commission: 35.00, netEarnings: 315.00 },
      { id: 5, date: '2024-09-30', orderId: 1005, productName: 'Versace Eros', productNameAr: 'فيرساتشي إيروس', amount: 95.00, commission: 9.50, netEarnings: 85.50 },
      { id: 6, date: '2024-09-28', orderId: 1006, productName: 'YSL Y', productNameAr: 'إيف سان لوران واي', amount: 110.00, commission: 11.00, netEarnings: 99.00 },
      { id: 7, date: '2024-09-25', orderId: 1007, productName: 'Paco Rabanne Invictus', productNameAr: 'باكو رابان إنفيكتوس', amount: 75.00, commission: 7.50, netEarnings: 67.50 },
      { id: 8, date: '2024-09-20', orderId: 1008, productName: 'Giorgio Armani Code', productNameAr: 'جورجيو أرماني كود', amount: 85.00, commission: 8.50, netEarnings: 76.50 },
    ];

    const totalEarnings = mockEarnings.reduce((sum, e) => sum + e.amount, 0);
    const totalCommission = mockEarnings.reduce((sum, e) => sum + e.commission, 0);
    const netEarnings = mockEarnings.reduce((sum, e) => sum + e.netEarnings, 0);
    const averageOrder = totalEarnings / mockEarnings.length;

    setEarnings(mockEarnings);
    setSummary({ totalEarnings, totalCommission, netEarnings, averageOrder });
    setLoading(false);
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-luxury p-6 shadow-luxury">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💰</span>
            <h3 className="text-sm text-taupe">{t('seller.totalEarnings')}</h3>
          </div>
          <p className="text-3xl font-bold text-charcoal">{formatPrice(summary.totalEarnings, language)}</p>
        </div>

        <div className="bg-white rounded-luxury p-6 shadow-luxury">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📊</span>
            <h3 className="text-sm text-taupe">{t('seller.commission')}</h3>
          </div>
          <p className="text-3xl font-bold text-red-600">{formatPrice(summary.totalCommission, language)}</p>
        </div>

        <div className="bg-gradient-to-br from-gold to-gold-hover rounded-luxury p-6 shadow-luxury">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">✨</span>
            <h3 className="text-sm text-charcoal">{t('seller.netEarnings')}</h3>
          </div>
          <p className="text-3xl font-bold text-charcoal">{formatPrice(summary.netEarnings, language)}</p>
        </div>

        <div className="bg-white rounded-luxury p-6 shadow-luxury">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📈</span>
            <h3 className="text-sm text-taupe">{t('seller.averageOrder')}</h3>
          </div>
          <p className="text-3xl font-bold text-charcoal">{formatPrice(summary.averageOrder, language)}</p>
        </div>
      </div>

      {/* Earnings Table */}
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <h2 className="text-h3 text-charcoal mb-6">{t('seller.earningsHistory')}</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.date')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.orderId')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.product')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.saleAmount')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.commission')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.netEarnings')}</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((record) => (
                <tr key={record.id} className="border-b border-gray-100 hover:bg-sand transition">
                  <td className="px-4 py-4 text-charcoal-light">
                    {new Date(record.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">{record.orderId}</td>
                  <td className="px-4 py-4 text-charcoal">
                    {i18n.language === 'ar' ? record.productNameAr : record.productName}
                  </td>
                  <td className="px-4 py-4 text-charcoal font-semibold">{formatPrice(record.amount, language)}</td>
                  <td className="px-4 py-4 text-red-600">-{formatPrice(record.commission, language)}</td>
                  <td className="px-4 py-4 text-green-600 font-bold">{formatPrice(record.netEarnings, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simple Chart Visualization */}
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <h3 className="text-h3 text-charcoal mb-6">{t('seller.earningsTrend')}</h3>
        <div className="flex items-end gap-2 h-64">
          {earnings.slice(0, 7).reverse().map((record) => {
            const maxEarning = Math.max(...earnings.map(e => e.netEarnings));
            const heightPercent = (record.netEarnings / maxEarning) * 100;
            
            return (
              <div key={record.id} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gradient-to-t from-gold to-gold-hover rounded-t-lg transition-all hover:opacity-80 cursor-pointer relative group"
                  style={{ height: `${heightPercent}%` }}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-charcoal text-ivory text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    {formatPrice(record.netEarnings, language)}
                  </div>
                </div>
                <span className="text-xs text-taupe">
                  {new Date(record.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
