import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { formatPrice } from '../utils/currency';
import api from '../lib/api';

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
  const [error, setError] = useState<string | null>(null);
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
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/seller/earnings');
      const records: EarningsRecord[] = (res.data?.records ?? []).map((r: any) => ({
        id: r.id,
        date: r.date,
        orderId: r.orderId,
        productName: r.productName,
        productNameAr: r.productNameAr,
        amount: Number(r.amount ?? 0),
        commission: Number(r.commission ?? 0),
        netEarnings: Number(r.netEarnings ?? 0),
      }));
      const summaryData = res.data?.summary ?? {
        totalEarnings: 0,
        totalCommission: 0,
        netEarnings: 0,
        averageOrder: 0,
      };
      setEarnings(records);
      setSummary({
        totalEarnings: Number(summaryData.totalEarnings ?? 0),
        totalCommission: Number(summaryData.totalCommission ?? 0),
        netEarnings: Number(summaryData.netEarnings ?? 0),
        averageOrder: Number(summaryData.averageOrder ?? 0),
      });
    } catch (err: any) {
      console.error('Failed to load earnings', err);
      setError(err?.response?.data?.detail || err?.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.loading')}</p>
      </div>
    );
  }

  const downloadCsv = () => {
    window.open('/seller/earnings?export=csv', '_blank');
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-luxury">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <div className="flex gap-2">
          <button
            onClick={downloadCsv}
            className="px-3 py-2 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition text-sm"
          >
            {t('seller.exportCsv', 'تصدير CSV / Excel')}
          </button>
        </div>
      </div>

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
