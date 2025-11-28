import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SARIcon from '../components/common/SARIcon';

interface SalesData {
  date: string;
  sales: number;
  commission: number;
  auctions: number;
}

export default function AdminReportsPage() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalSales: 0, totalCommission: 0, totalAuctions: 0 });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockData: SalesData[] = [
      { date: '2024-10-01', sales: 12450, commission: 1245, auctions: 5 },
      { date: '2024-10-02', sales: 8930, commission: 893, auctions: 3 },
      { date: '2024-10-03', sales: 15670, commission: 1567, auctions: 7 },
      { date: '2024-10-04', sales: 11200, commission: 1120, auctions: 4 },
      { date: '2024-10-05', sales: 13800, commission: 1380, auctions: 6 },
    ];

    const totalSales = mockData.reduce((sum, d) => sum + d.sales, 0);
    const totalCommission = mockData.reduce((sum, d) => sum + d.commission, 0);
    const totalAuctions = mockData.reduce((sum, d) => sum + d.auctions, 0);

    setData(mockData);
    setSummary({ totalSales, totalCommission, totalAuctions });
    setLoading(false);
  };

  const handleExportCSV = () => {
    const csv = [
      ['Date', 'Sales', 'Commission', 'Auctions'],
      ...data.map(d => [d.date, d.sales, d.commission, d.auctions])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reports.csv';
    a.click();
  };

  const numberLocale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const renderCurrency = (value: number, iconSize = 16, className = '') => (
    <span className={`inline-flex items-center gap-1 ${className}`.trim()}>
      {value.toLocaleString(numberLocale)}
      <SARIcon size={iconSize} />
    </span>
  );

  if (loading) {
    return <div className="text-center py-12"><p className="text-taupe">{t('common.loading')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-h2 text-charcoal">{t('admin.reports')}</h1>
          <button onClick={handleExportCSV} className="bg-gold text-charcoal px-6 py-2 rounded-luxury font-semibold hover:bg-gold-hover">
            📥 {t('admin.exportCSV')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-gold to-gold-hover rounded-luxury p-6 shadow-luxury">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">💰</span>
              <h3 className="text-sm text-charcoal">{t('admin.totalSales')}</h3>
            </div>
            <p className="text-3xl font-bold text-charcoal">{renderCurrency(summary.totalSales, 18)}</p>
          </div>

          <div className="bg-white rounded-luxury p-6 shadow-luxury">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📊</span>
              <h3 className="text-sm text-taupe">{t('admin.totalCommission')}</h3>
            </div>
            <p className="text-3xl font-bold text-charcoal">{renderCurrency(summary.totalCommission, 18)}</p>
          </div>

          <div className="bg-white rounded-luxury p-6 shadow-luxury">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔨</span>
              <h3 className="text-sm text-taupe">{t('admin.totalAuctions')}</h3>
            </div>
            <p className="text-3xl font-bold text-charcoal">{summary.totalAuctions}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-h3 text-charcoal mb-4">{t('admin.salesChart')}</h3>
          <div className="flex items-end gap-2 h-64">
            {data.map((d) => {
              const maxSales = Math.max(...data.map(item => item.sales));
              const heightPercent = (d.sales / maxSales) * 100;
              
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-gold to-gold-hover rounded-t-lg transition-all hover:opacity-80 cursor-pointer relative group"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-charcoal text-ivory text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                      {renderCurrency(d.sales, 12)}
                    </div>
                  </div>
                  <span className="text-xs text-taupe">
                    {new Date(d.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.date')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.sales')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.commission')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.auctions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-b border-gray-100 hover:bg-sand">
                  <td className="px-4 py-4 text-charcoal-light">{new Date(d.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td className="px-4 py-4 text-charcoal font-semibold">{renderCurrency(d.sales, 14)}</td>
                  <td className="px-4 py-4 text-gold font-semibold">{renderCurrency(d.commission, 14)}</td>
                  <td className="px-4 py-4 text-charcoal-light">{d.auctions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
