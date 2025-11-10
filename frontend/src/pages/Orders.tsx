import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Order } from '../types';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { formatPrice } from '../utils/currency';
import { resolveImageUrl } from '../utils/image';

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
        fetchedOrders = fetchedOrders
          .map((order: Order) => {
            const sellerItems =
              order.items?.filter((item) => item.product?.seller_id === user?.id) ?? [];
            if (!sellerItems.length) {
              return null;
            }
            const primary = sellerItems[0];
            return {
              ...order,
              items: sellerItems,
              product: primary.product ?? order.product,
              product_id: primary.product_id,
              quantity: primary.quantity,
              unit_price: primary.unit_price,
            };
          })
          .filter(Boolean);
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

  const getShippingLabel = (method?: string) => {
    if (method === 'express') return t('orders.expressShipping');
    return t('orders.standardShipping');
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
            const itemList =
              order.items && order.items.length > 0
                ? order.items
                : order.product
                ? [
                    {
                      id: order.product_id ?? order.id,
                      product_id: order.product_id ?? order.id,
                      quantity: order.quantity,
                      unit_price: order.unit_price,
                      total_price: order.total_amount,
                      product: order.product,
                    },
                  ]
                : [];

            const primaryProduct = itemList[0]?.product ?? order.product;
            const productName = primaryProduct
              ? (language === 'ar' ? primaryProduct.name_ar : primaryProduct.name_en)
              : t('products.unknownProduct');
            const imageUrl = resolveImageUrl(primaryProduct?.image_urls?.[0]) || '/images/placeholder-perfume.svg';

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

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-sand/40 pt-4">
                        <div>
                          <p className="text-xs text-charcoal-light">{t('orders.shippingName')}</p>
                          <p className="font-semibold text-charcoal">{order.shipping_name || t('orders.unknown')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-charcoal-light">{t('orders.shippingPhone')}</p>
                          <p className="font-semibold text-charcoal">{order.shipping_phone || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-charcoal-light">{t('orders.shippingCity')}</p>
                          <p className="font-semibold text-charcoal">{order.shipping_city || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-charcoal-light">{t('orders.shippingRegion')}</p>
                          <p className="font-semibold text-charcoal">{order.shipping_region || '-'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-xs text-charcoal-light">{t('orders.shippingAddress')}</p>
                          <p className="font-semibold text-charcoal">{order.shipping_address}</p>
                        </div>
                        <div>
                          <p className="text-xs text-charcoal-light">{t('orders.shippingMethod')}</p>
                          <p className="font-semibold text-charcoal">{getShippingLabel(order.shipping_method)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-charcoal-light">{t('orders.shippingFee')}</p>
                          <p className="font-semibold text-charcoal">
                            {formatPrice(order.shipping_fee ?? 0, language)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 space-y-3">
                        <p className="text-sm font-semibold text-charcoal">
                          {t('orders.items')}
                        </p>
                        {itemList.map((item) => {
                          const itemProduct = item.product;
                          const itemName = itemProduct
                            ? (language === 'ar' ? itemProduct.name_ar : itemProduct.name_en)
                            : t('products.unknownProduct');
                          const itemImage = resolveImageUrl(itemProduct?.image_urls?.[0]) || '/images/placeholder-perfume.svg';
                          const totalPrice =
                            typeof item.total_price === 'number'
                              ? item.total_price
                              : item.unit_price * item.quantity;

                          return (
                            <div
                              key={`${order.id}-${item.id}`}
                              className="flex items-start justify-between gap-4 rounded-lg border border-sand/50 p-3"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={itemImage}
                                  alt={itemName}
                                  className="w-14 h-14 object-cover rounded-md"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder-perfume.jpg';
                                  }}
                                />
                                <div>
                                  <p className="text-sm font-semibold text-charcoal">{itemName}</p>
                                  <p className="text-xs text-taupe">{itemProduct?.brand}</p>
                                </div>
                              </div>
                              <div className="text-right text-sm text-charcoal">
                                <p>{t('orders.quantity')}: <span className="font-semibold">{item.quantity}</span></p>
                                <p>{t('orders.unitPrice')}: <span className="font-semibold">{formatPrice(item.unit_price, language)}</span></p>
                                <p className="font-semibold text-gold">
                                  {t('orders.amount')}: {formatPrice(totalPrice, language)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
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
