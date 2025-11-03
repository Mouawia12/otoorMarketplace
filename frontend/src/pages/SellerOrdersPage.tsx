import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { formatPrice } from '../utils/currency';

interface Order {
  id: number;
  buyerName: string;
  productName: string;
  productNameAr: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'completed' | 'canceled';
  date: string;
}

export default function SellerOrdersPage() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockOrders: Order[] = [
      { id: 1001, buyerName: 'Ahmed Mohamed', productName: 'Chanel No 5', productNameAr: 'شانيل رقم 5', amount: 150.00, status: 'pending', date: '2024-10-05' },
      { id: 1002, buyerName: 'Fatima Ali', productName: 'Dior Sauvage', productNameAr: 'ديور سوفاج', amount: 120.00, status: 'confirmed', date: '2024-10-04' },
      { id: 1003, buyerName: 'Omar Hassan', productName: 'Tom Ford Oud Wood', productNameAr: 'توم فورد أود وود', amount: 280.00, status: 'shipped', date: '2024-10-03' },
      { id: 1004, buyerName: 'Sara Ibrahim', productName: 'Creed Aventus', productNameAr: 'كريد أفينتوس', amount: 350.00, status: 'completed', date: '2024-10-01' },
      { id: 1005, buyerName: 'Khalid Ahmed', productName: 'Versace Eros', productNameAr: 'فيرساتشي إيروس', amount: 95.00, status: 'confirmed', date: '2024-10-04' },
      { id: 1006, buyerName: 'Layla Mahmoud', productName: 'Yves Saint Laurent Y', productNameAr: 'إيف سان لوران واي', amount: 110.00, status: 'pending', date: '2024-10-05' },
      { id: 1007, buyerName: 'Hassan Karim', productName: 'Paco Rabanne Invictus', productNameAr: 'باكو رابان إنفيكتوس', amount: 75.00, status: 'shipped', date: '2024-10-02' },
      { id: 1008, buyerName: 'Nour Said', productName: 'Giorgio Armani Code', productNameAr: 'جورجيو أرماني كود', amount: 85.00, status: 'completed', date: '2024-09-28' },
    ];

    setOrders(mockOrders);
    setLoading(false);
  };

  const handleStatusUpdate = (orderId: number, newStatus: Order['status']) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => o.status === filter);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'text-gold bg-gold bg-opacity-10';
      case 'confirmed': return 'text-blue-600 bg-blue-100';
      case 'shipped': return 'text-purple-600 bg-purple-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'canceled': return 'text-red-600 bg-red-100';
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
          <h1 className="text-h2 text-charcoal">{t('seller.orders')}</h1>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-luxury text-sm font-semibold transition ${
                filter === 'all' ? 'bg-gold text-charcoal' : 'bg-sand text-charcoal-light'
              }`}
            >
              {t('seller.allOrders')}
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-luxury text-sm font-semibold transition ${
                filter === 'pending' ? 'bg-gold text-charcoal' : 'bg-sand text-charcoal-light'
              }`}
            >
              {t('seller.pending')}
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              className={`px-4 py-2 rounded-luxury text-sm font-semibold transition ${
                filter === 'confirmed' ? 'bg-gold text-charcoal' : 'bg-sand text-charcoal-light'
              }`}
            >
              {t('seller.confirmed')}
            </button>
            <button
              onClick={() => setFilter('shipped')}
              className={`px-4 py-2 rounded-luxury text-sm font-semibold transition ${
                filter === 'shipped' ? 'bg-gold text-charcoal' : 'bg-sand text-charcoal-light'
              }`}
            >
              {t('seller.shipped')}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.orderId')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.buyer')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.product')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.amount')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.date')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.status')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-sand transition">
                  <td className="px-4 py-4 text-charcoal-light">{order.id}</td>
                  <td className="px-4 py-4 text-charcoal font-medium">{order.buyerName}</td>
                  <td className="px-4 py-4 text-charcoal">
                    {i18n.language === 'ar' ? order.productNameAr : order.productName}
                  </td>
                  <td className="px-4 py-4 text-charcoal font-semibold">{formatPrice(order.amount, language)}</td>
                  <td className="px-4 py-4 text-charcoal-light">
                    {new Date(order.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                      {t(`seller.${order.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                      >
                        {t('seller.confirm')}
                      </button>
                    )}
                    {order.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'shipped')}
                        className="text-purple-600 hover:text-purple-700 text-sm font-semibold"
                      >
                        {t('seller.markShipped')}
                      </button>
                    )}
                    {order.status === 'shipped' && (
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'completed')}
                        className="text-green-600 hover:text-green-700 text-sm font-semibold"
                      >
                        {t('seller.complete')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-taupe">{t('seller.noOrders')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
