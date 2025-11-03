import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import { formatPrice } from '../utils/currency';

interface Order {
  id: number;
  productName: string;
  productNameAr: string;
  date: string;
  amount: number;
  status: 'pending' | 'shipped' | 'completed' | 'canceled';
}

export default function OrdersPage() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockOrders: Order[] = [
        {
          id: 1001,
          productName: 'Chanel No 5',
          productNameAr: 'شانيل رقم 5',
          date: '2024-10-01',
          amount: 150.00,
          status: 'completed',
        },
        {
          id: 1002,
          productName: 'Dior Sauvage',
          productNameAr: 'ديور سوفاج',
          date: '2024-10-03',
          amount: 120.00,
          status: 'shipped',
        },
        {
          id: 1003,
          productName: 'Tom Ford Oud Wood',
          productNameAr: 'توم فورد أود وود',
          date: '2024-10-04',
          amount: 280.00,
          status: 'pending',
        },
        {
          id: 1004,
          productName: 'Creed Aventus',
          productNameAr: 'كريد أفينتوس',
          date: '2024-09-28',
          amount: 350.00,
          status: 'completed',
        },
        {
          id: 1005,
          productName: 'Jo Malone Lime Basil',
          productNameAr: 'جو مالون ليمون بايزل',
          date: '2024-09-25',
          amount: 95.00,
          status: 'canceled',
        },
      ];

      setOrders(mockOrders);
      setLoading(false);
    };

    fetchOrders();
  }, []);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gold bg-gold bg-opacity-10';
      case 'shipped':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'canceled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(order => order.status === filter);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-luxury p-6 shadow-luxury">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-h2 text-charcoal">{t('account.orders')}</h1>
        
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-luxury text-sm font-semibold transition ${
              filter === 'all'
                ? 'bg-gold text-charcoal'
                : 'bg-sand text-charcoal-light hover:bg-gold hover:bg-opacity-30'
            }`}
          >
            {t('account.allOrders')}
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-luxury text-sm font-semibold transition ${
              filter === 'pending'
                ? 'bg-gold text-charcoal'
                : 'bg-sand text-charcoal-light hover:bg-gold hover:bg-opacity-30'
            }`}
          >
            {t('orders.pending')}
          </button>
          <button
            onClick={() => setFilter('shipped')}
            className={`px-4 py-2 rounded-luxury text-sm font-semibold transition ${
              filter === 'shipped'
                ? 'bg-gold text-charcoal'
                : 'bg-sand text-charcoal-light hover:bg-gold hover:bg-opacity-30'
            }`}
          >
            {t('orders.shipped')}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-luxury text-sm font-semibold transition ${
              filter === 'completed'
                ? 'bg-gold text-charcoal'
                : 'bg-sand text-charcoal-light hover:bg-gold hover:bg-opacity-30'
            }`}
          >
            {t('orders.completed')}
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-taupe">{t('account.noOrders')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">
                  {t('orders.orderId')}
                </th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">
                  {t('orders.product')}
                </th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">
                  {t('orders.date')}
                </th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">
                  {t('orders.amount')}
                </th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">
                  {t('orders.status')}
                </th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">
                  {t('orders.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-sand transition">
                  <td className="px-4 py-4 text-charcoal-light">{order.id}</td>
                  <td className="px-4 py-4 text-charcoal font-medium">
                    {i18n.language === 'ar' ? order.productNameAr : order.productName}
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">
                    {new Date(order.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="px-4 py-4 text-charcoal font-semibold">
                    {formatPrice(order.amount, language)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {t(`orders.${order.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Link
                        to={`/account/orders/${order.id}`}
                        className="text-gold hover:text-gold-hover text-sm font-semibold"
                      >
                        {t('orders.view')}
                      </Link>
                      <button className="text-charcoal-light hover:text-charcoal text-sm font-semibold">
                        {t('orders.invoice')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
