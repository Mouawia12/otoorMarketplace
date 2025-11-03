import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Order {
  id: number;
  buyer: string;
  product: string;
  productAr: string;
  amount: number;
  status: 'pending' | 'seller_confirmed' | 'shipped' | 'completed' | 'canceled' | 'dispute';
  date: string;
}

export default function AdminOrdersPage() {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setOrders([
      { id: 1001, buyer: 'Ahmed M.', product: 'Chanel No 5', productAr: 'شانيل رقم 5', amount: 150, status: 'pending', date: '2024-10-05' },
      { id: 1002, buyer: 'Fatima A.', product: 'Dior Sauvage', productAr: 'ديور سوفاج', amount: 120, status: 'seller_confirmed', date: '2024-10-04' },
      { id: 1003, buyer: 'Omar H.', product: 'Tom Ford Oud', productAr: 'توم فورد أود وود', amount: 280, status: 'shipped', date: '2024-10-03' },
      { id: 1004, buyer: 'Sara I.', product: 'Creed Aventus', productAr: 'كريد أفينتوس', amount: 350, status: 'completed', date: '2024-10-01' },
      { id: 1005, buyer: 'Khalid A.', product: 'Versace Eros', productAr: 'فيرساتشي إيروس', amount: 95, status: 'dispute', date: '2024-10-04' },
    ]);
    setLoading(false);
  };

  const handleStatusChange = (id: number, newStatus: Order['status']) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const handleExportCSV = () => {
    const csv = [
      ['Order ID', 'Buyer', 'Product', 'Amount', 'Status', 'Date'],
      ...orders.map(o => [o.id, o.buyer, o.product, o.amount, o.status, o.date])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-gold bg-gold bg-opacity-10';
      case 'seller_confirmed': return 'text-blue-600 bg-blue-100';
      case 'shipped': return 'text-purple-600 bg-purple-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'canceled': return 'text-gray-600 bg-gray-200';
      case 'dispute': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return <div className="text-center py-12"><p className="text-taupe">{t('common.loading')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-h2 text-charcoal">{t('admin.orders')}</h1>
          <button onClick={handleExportCSV} className="bg-gold text-charcoal px-6 py-2 rounded-luxury font-semibold hover:bg-gold-hover">
            📥 {t('admin.exportCSV')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.orderId')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.buyer')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.product')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.amount')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.status')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.date')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-100 hover:bg-sand">
                  <td className="px-4 py-4 text-charcoal-light">{o.id}</td>
                  <td className="px-4 py-4 text-charcoal font-medium">{o.buyer}</td>
                  <td className="px-4 py-4 text-charcoal">{i18n.language === 'ar' ? o.productAr : o.product}</td>
                  <td className="px-4 py-4 text-charcoal font-semibold">{o.amount} ريال</td>
                  <td className="px-4 py-4">
                    <select value={o.status} onChange={(e) => handleStatusChange(o.id, e.target.value as Order['status'])} className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(o.status)} border-none`}>
                      <option value="pending">{t('admin.pending')}</option>
                      <option value="seller_confirmed">{t('admin.sellerConfirmed')}</option>
                      <option value="shipped">{t('admin.shipped')}</option>
                      <option value="completed">{t('admin.completed')}</option>
                      <option value="canceled">{t('admin.canceled')}</option>
                      <option value="dispute">{t('admin.dispute')}</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">{new Date(o.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
