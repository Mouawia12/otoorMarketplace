import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Order } from '../types';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { formatPrice } from '../utils/currency';

export default function Orders() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchOrders();
  }, [filter, isAuthenticated]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filter !== 'all') {
        params.status = filter;
      }
      
      const isSeller = user?.roles?.includes('seller');
      const isAdmin = user?.roles?.some(role => ['admin', 'super_admin'].includes(role));
      
      const endpoint = isAdmin || isSeller ? '/orders' : '/orders/mine';
      
      const response = await api.get(endpoint, { params });
      let fetchedOrders = response.data;
      
      if (isSeller && !isAdmin) {
        fetchedOrders = fetchedOrders.filter((order: Order) => 
          order.product?.seller_id === user?.id
        );
      }
      
      setOrders(fetchedOrders);
    } catch (error: any) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        alert(t('orders.authRequired'));
        navigate('/login');
      } else {
        console.error('Failed to fetch orders:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      seller_confirmed: 'bg-blue-100 text-blue-700',
      shipped: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      canceled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const isSeller = user?.roles?.includes('seller');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-charcoal">{t('orders.title')}</h1>
      </div>

      <div className="bg-white rounded-luxury shadow-luxury p-4 mb-6">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-luxury whitespace-nowrap transition ${
              filter === 'all' ? 'bg-gold text-charcoal' : 'bg-gray-100 text-charcoal-light hover:bg-gray-200'
            }`}
          >
            {t('orders.allOrders')}
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-luxury whitespace-nowrap transition ${
              filter === 'pending' ? 'bg-gold text-charcoal' : 'bg-gray-100 text-charcoal-light hover:bg-gray-200'
            }`}
          >
            {t('orders.statuses.pending')}
          </button>
          <button
            onClick={() => setFilter('seller_confirmed')}
            className={`px-4 py-2 rounded-luxury whitespace-nowrap transition ${
              filter === 'seller_confirmed' ? 'bg-gold text-charcoal' : 'bg-gray-100 text-charcoal-light hover:bg-gray-200'
            }`}
          >
            {t('orders.statuses.seller_confirmed')}
          </button>
          <button
            onClick={() => setFilter('shipped')}
            className={`px-4 py-2 rounded-luxury whitespace-nowrap transition ${
              filter === 'shipped' ? 'bg-gold text-charcoal' : 'bg-gray-100 text-charcoal-light hover:bg-gray-200'
            }`}
          >
            {t('orders.statuses.shipped')}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-luxury whitespace-nowrap transition ${
              filter === 'completed' ? 'bg-gold text-charcoal' : 'bg-gray-100 text-charcoal-light hover:bg-gray-200'
            }`}
          >
            {t('orders.statuses.completed')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">{t('common.loading')}</p>
        </div>
      ) : !isAuthenticated ? (
        <div className="bg-white p-12 rounded-luxury shadow-luxury text-center">
          <p className="text-charcoal-light mb-4">{t('orders.authRequired')}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-gold text-charcoal px-6 py-2 rounded-luxury font-semibold hover:bg-gold-light transition"
          >
            {t('common.login')}
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white p-12 rounded-luxury shadow-luxury text-center">
          <p className="text-charcoal-light">{t('orders.noOrders')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const product = order.product;
            const productName = product ? (language === 'ar' ? product.name_ar : product.name_en) : t('products.unknownProduct');
            const imageUrl = product?.image_urls?.[0] || '/placeholder-perfume.jpg';

            return (
              <div key={order.id} className="bg-white rounded-luxury shadow-luxury overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <img
                      src={imageUrl}
                      alt={productName}
                      className="w-20 h-20 object-cover rounded-luxury"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-perfume.jpg';
                      }}
                    />
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-charcoal">{productName}</h3>
                          <p className="text-sm text-charcoal-light">
                            {t('orders.orderNumber')}: {order.id}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                          {t(`orders.statuses.${order.status}`)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-charcoal-light">{t('orders.quantity')}</p>
                          <p className="font-semibold text-charcoal">{order.quantity}</p>
                        </div>
                        <div>
                          <p className="text-xs text-charcoal-light">{t('orders.total')}</p>
                          <p className="font-semibold text-gold">{formatPrice(order.total_amount, language)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-charcoal-light">{t('orders.paymentMethod')}</p>
                          <p className="font-semibold text-charcoal">{order.payment_method}</p>
                        </div>
                        <div>
                          <p className="text-xs text-charcoal-light">{t('orders.date')}</p>
                          <p className="font-semibold text-charcoal">
                            {new Date(order.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                          </p>
                        </div>
                      </div>

                      {isSeller && order.status === 'pending' && (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await api.patch(`/orders/${order.id}/status`, { status: 'seller_confirmed' });
                                fetchOrders();
                              } catch (error: any) {
                                alert(error.response?.data?.detail || t('orders.confirmFailed'));
                              }
                            }}
                            className="bg-gold text-charcoal px-4 py-2 rounded-luxury text-sm font-semibold hover:bg-gold-light transition"
                          >
                            {t('orders.confirmOrder')}
                          </button>
                        </div>
                      )}

                      {isSeller && order.status === 'seller_confirmed' && (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await api.patch(`/orders/${order.id}/status`, { status: 'shipped' });
                                fetchOrders();
                              } catch (error: any) {
                                alert(error.response?.data?.detail || t('orders.shipFailed'));
                              }
                            }}
                            className="bg-gold text-charcoal px-4 py-2 rounded-luxury text-sm font-semibold hover:bg-gold-light transition"
                          >
                            {t('orders.markAsShipped')}
                          </button>
                        </div>
                      )}

                      {isSeller && order.status === 'shipped' && (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await api.patch(`/orders/${order.id}/status`, { status: 'completed' });
                                fetchOrders();
                              } catch (error: any) {
                                alert(error.response?.data?.detail || t('orders.completeFailed'));
                              }
                            }}
                            className="bg-gold text-charcoal px-4 py-2 rounded-luxury text-sm font-semibold hover:bg-gold-light transition"
                          >
                            {t('orders.markAsCompleted')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
