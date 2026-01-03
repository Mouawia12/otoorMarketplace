import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Order } from '../types';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { formatPrice } from '../utils/currency';
import { resolveProductImageUrl } from '../utils/image';
import { PLACEHOLDER_PERFUME } from '../utils/staticAssets';
import { submitProductReview } from '../services/reviewService';
import api from '../lib/api';

type OrdersView = 'buyer' | 'seller';

type OrdersProps = {
  view?: OrdersView;
};

export default function Orders({ view }: OrdersProps = {}) {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; comment: string; submitted?: boolean }>>({});
  const [submittingReviewKey, setSubmittingReviewKey] = useState<string | null>(null);
  const [printingLabel, setPrintingLabel] = useState(false);

  const userIsSeller = useMemo(() => user?.roles?.includes('seller'), [user]);
  const userIsAdmin = useMemo(() => user?.roles?.some((r) => ['admin', 'super_admin'].includes(r)), [user]);

  const sellerMode = view === 'seller' || (!view && userIsAdmin);
  const buyerMode = view === 'buyer' || (!sellerMode && !userIsAdmin);

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
      if (filter !== 'all') params.status = filter;

      const endpoint = sellerMode || userIsAdmin ? '/orders' : '/orders/mine';
      const response = await api.get(endpoint, { params });
      let fetched = response.data;

      if (sellerMode && !userIsAdmin) {
        fetched = fetched
          .map((order: Order) => {
            const sellerItems = order.items?.filter((item) => item.product?.seller_id === user?.id) ?? [];
            if (!sellerItems.length) return null;
            return { ...order, items: sellerItems };
          })
          .filter(Boolean);
      }

      setOrders(fetched);
    } catch (error: any) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        navigate('/login');
      } else {
        console.error('Failed to fetch orders', error);
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
      canceled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getShippingLabel = (method?: string) => {
    if (!method) return t('orders.standardShipping');
    const key = method.toLowerCase();
    if (key.includes('express')) return t('orders.expressShipping');
    if (key.includes('standard')) return t('orders.standardShipping');
    return method;
  };

  const itemListFromOrder = (order: Order) => {
    if (order.items && order.items.length) return order.items;
    if (order.product) {
      return [
        {
          id: order.product_id ?? order.id,
          product_id: order.product_id ?? order.id,
          quantity: order.quantity,
          unit_price: order.unit_price,
          total_price: order.total_amount,
          product: order.product,
        },
      ];
    }
    return [];
  };

  const handleStatusUpdate = async () => {
    if (!activeOrder || !selectedStatus) return;
    try {
      setUpdatingStatus(true);
      await api.patch(`/orders/${activeOrder.id}/status`, { status: selectedStatus });
      await fetchOrders();
      setActiveOrder((prev) => (prev ? { ...prev, status: selectedStatus } : prev));
    } catch (err: any) {
      alert(err?.response?.data?.detail || t('orders.updateFailed', 'تعذر تحديث الحالة'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePrintLabel = async (orderId: number) => {
    try {
      setPrintingLabel(true);
      const response = await api.get(`/orders/${orderId}/label`);
      const labelUrl = response.data?.label_url;
      if (!labelUrl) {
        alert(t('orders.labelUnavailable', 'تعذر الحصول على بوليصة الشحن'));
        return;
      }
      window.open(labelUrl, '_blank', 'noopener,noreferrer');
      const updatedOrder = response.data?.order;
      if (updatedOrder) {
        setOrders((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
        setActiveOrder(updatedOrder);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        t('orders.labelUnavailable', 'تعذر الحصول على بوليصة الشحن');
      alert(message);
    } finally {
      setPrintingLabel(false);
    }
  };

  const updateReviewDraft = (key: string, patch: Partial<{ rating: number; comment: string; submitted?: boolean }>) => {
    setReviewDrafts((prev) => ({
      ...prev,
      [key]: (() => {
        const existing = prev[key] || {};
        const next: any = {
          ...existing,
          ...patch,
        };
        next.rating = patch.rating ?? existing.rating ?? 5;
        next.comment = patch.comment ?? existing.comment ?? '';
        return next;
      })(),
    }));
  };

  const handleSubmitReview = async (orderId: number, productId: number, key: string) => {
    const draft = reviewDrafts[key];
    if (!draft?.rating) {
      alert(t('reviews.validation'));
      return;
    }
    try {
      setSubmittingReviewKey(key);
      await submitProductReview(productId, {
        order_id: orderId,
        rating: draft.rating,
        comment: draft.comment,
      });
      updateReviewDraft(key, { submitted: true });
      alert(t('reviews.thankYou'));
    } catch (error: any) {
      alert(error?.response?.data?.detail || t('reviews.submitFailed'));
    } finally {
      setSubmittingReviewKey(null);
    }
  };

  const pageTitle = sellerMode && !userIsAdmin
    ? t('seller.customerOrdersTitle', 'طلبات العملاء')
    : buyerMode && userIsSeller
      ? t('seller.myOrdersTitle', 'طلباتي')
      : t('orders.title');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-charcoal">{pageTitle}</h1>
      </div>

      <div className="bg-white rounded-luxury shadow-sm border border-sand/60 p-3 sm:p-4">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { key: 'all', label: t('orders.allOrders') },
            { key: 'pending', label: t('orders.statuses.pending') },
            { key: 'seller_confirmed', label: t('orders.statuses.seller_confirmed') },
            { key: 'shipped', label: t('orders.statuses.shipped') },
            { key: 'completed', label: t('orders.statuses.completed') },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`px-4 py-2 rounded-luxury whitespace-nowrap text-sm font-semibold transition ${
                filter === btn.key ? 'bg-gold text-charcoal' : 'bg-sand/50 text-charcoal-light hover:bg-sand'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-charcoal-light">{t('common.loading')}</div>
      ) : !isAuthenticated ? (
        <div className="bg-white p-10 rounded-luxury shadow-sm text-center">
          <p className="text-charcoal-light mb-4">{t('orders.authRequired')}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-gold text-charcoal px-6 py-3 rounded-luxury font-semibold hover:bg-gold-hover transition"
          >
            {t('common.login')}
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white p-10 rounded-luxury shadow-sm text-center">
          <p className="text-charcoal-light">{t('orders.noOrders')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const items = itemListFromOrder(order);
            const primary = items[0]?.product ?? order.product;
            const name = primary ? (language === 'ar' ? primary.name_ar : primary.name_en) : t('products.unknownProduct');
            const image = resolveProductImageUrl(primary?.image_urls?.[0]) || PLACEHOLDER_PERFUME;
            const qty = order.quantity || items.reduce((sum, i) => sum + (i.quantity || 0), 0);
            return (
              <button
                key={order.id}
                onClick={() => {
                  setActiveOrder(order);
                  setSelectedStatus(order.status);
                }}
                className="w-full text-left bg-white rounded-xl border border-sand/60 shadow-sm hover:shadow-md transition p-4 sm:p-5"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <img
                    src={image}
                    alt={name}
                    className="w-14 h-14 sm:w-16 sm:h-16 object-contain bg-white rounded-lg border border-sand/60"
                    onError={(e) => {
                      e.currentTarget.src = PLACEHOLDER_PERFUME;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-semibold text-charcoal line-clamp-1">{name}</p>
                        <p className="text-xs text-charcoal-light">
                          {t('orders.orderNumber')}: {order.id} ·{' '}
                          {new Date(order.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(order.status)}`}>
                        {t(`orders.statuses.${order.status}`)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm text-charcoal-light">
                    <span>{t('orders.quantity')}: {qty}</span>
                    <span>{t('orders.total')}: {formatPrice(order.total_amount, language)}</span>
                    <span>{t('orders.shippingMethod')}: {getShippingLabel(order.shipping_method)}</span>
                  </div>
                  {(sellerMode || userIsAdmin) && order.shipping_phone && (
                    <p className="text-xs text-charcoal mt-1">
                      {t('orders.customerPhone')}: <span className="font-semibold">{order.shipping_phone}</span>
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        </div>
      )}

      {activeOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand/80">
              <div>
                <p className="text-xs text-taupe">{t('orders.orderNumber')}: {activeOrder.id}</p>
                <h3 className="text-lg font-bold text-charcoal">{t(`orders.statuses.${activeOrder.status}`)}</h3>
              </div>
              {(sellerMode || userIsAdmin) && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="border border-sand/70 rounded-lg px-3 py-2 text-sm"
                  >
                    {['pending', 'seller_confirmed', 'shipped', 'completed', 'canceled'].map((s) => (
                      <option key={s} value={s}>
                        {t(`orders.statuses.${s}`)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={updatingStatus || selectedStatus === activeOrder.status}
                    className="bg-gold text-charcoal px-3 py-2 rounded-luxury text-sm font-semibold hover:bg-gold-hover transition disabled:opacity-50"
                  >
                    {updatingStatus ? t('common.loading') : t('common.save', 'حفظ')}
                  </button>
                </div>
              )}
              <button
                onClick={() => setActiveOrder(null)}
                className="text-charcoal hover:text-alert text-sm font-semibold"
              >
                {t('common.close')}
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 text-sm text-charcoal">
                <div>
                  <p className="text-taupe text-xs mb-1">{t('orders.total')}</p>
                  <p className="font-semibold">{formatPrice(activeOrder.total_amount, language)}</p>
                </div>
                <div>
                  <p className="text-taupe text-xs mb-1">{t('orders.shippingMethod')}</p>
                  <p className="font-semibold">{getShippingLabel(activeOrder.shipping_method)}</p>
                </div>
                <div>
                  <p className="text-taupe text-xs mb-1">{t('orders.status')}</p>
                  <p className="font-semibold">{t(`orders.statuses.${activeOrder.status}`)}</p>
                </div>
                <div>
                  <p className="text-taupe text-xs mb-1">{t('orders.date')}</p>
                  <p className="font-semibold">
                    {new Date(activeOrder.created_at).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                  </p>
                </div>
                {(sellerMode || userIsAdmin) && activeOrder.shipping_phone && (
                  <div className="col-span-2 sm:col-span-2 md:col-span-1">
                    <p className="text-taupe text-xs mb-1">{t('orders.customerPhone')}</p>
                    <p className="font-semibold">{activeOrder.shipping_phone}</p>
                  </div>
                )}
              </div>

              <div className="border rounded-xl border-sand/70">
                <div className="px-4 py-3 border-b border-sand/70 flex items-center justify-between">
                  <h4 className="font-semibold text-charcoal">{t('orders.items')}</h4>
                  <span className="text-xs text-taupe">
                    {(activeOrder.items?.length ?? itemListFromOrder(activeOrder).length)} {t('orders.itemsCount', 'عنصر')}
                  </span>
                </div>
                <div className="divide-y divide-sand/60">
              {(activeOrder.items && activeOrder.items.length ? activeOrder.items : itemListFromOrder(activeOrder)).map((item, idx) => {
                const p = item.product;
                const name = p ? (language === 'ar' ? p.name_ar : p.name_en) : t('products.unknownProduct');
                const img = resolveProductImageUrl(p?.image_urls?.[0]) || PLACEHOLDER_PERFUME;
                const reviewKey = `${activeOrder.id}-${item.product_id}`;
                const reviewDraft = reviewDrafts[reviewKey] || { rating: 5, comment: '', submitted: false };
                return (
                  <div key={`${item.id}-${idx}`} className="px-4 py-3 flex items-start gap-3">
                    <img
                      src={img}
                      alt={name}
                          className="w-14 h-14 object-contain bg-white rounded-lg border border-sand/60"
                          onError={(e) => {
                            e.currentTarget.src = PLACEHOLDER_PERFUME;
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-charcoal line-clamp-1">{name}</p>
                          <p className="text-xs text-taupe">
                            {t('orders.quantity')}: {item.quantity} · {formatPrice(item.unit_price, language)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-sm font-semibold text-charcoal">
                            {formatPrice(item.total_price ?? item.unit_price * (item.quantity ?? 1), language)}
                          </div>
                          {!sellerMode && activeOrder.status === 'completed' && (
                            <div className="w-full border-t border-sand/60 pt-2">
                              <p className="text-xs font-semibold text-charcoal mb-2">{t('reviews.leaveReview')}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, starIdx) => (
                                    <button
                                      key={starIdx}
                                      type="button"
                                      onClick={() => updateReviewDraft(reviewKey, { rating: starIdx + 1 })}
                                      className={`p-1 rounded ${reviewDraft.rating >= starIdx + 1 ? 'text-gold' : 'text-sand hover:text-gold'}`}
                                      disabled={reviewDraft.submitted}
                                      aria-label={`${t('reviews.ratingStar')} ${starIdx + 1}`}
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        viewBox="0 0 24 24"
                                        fill={reviewDraft.rating >= starIdx + 1 ? 'currentColor' : 'none'}
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M12 17.3l-5.2 3.1 1.5-5.8-4.5-3.9 5.9-.5L12 5l2.3 5.2 5.9.5-4.5 3.9 1.5 5.8z"
                                        />
                                      </svg>
                                    </button>
                                  ))}
                                </div>
                                <input
                                  type="text"
                                  className="flex-1 min-w-[180px] border border-sand/80 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gold/40"
                                  placeholder={t('reviews.commentPlaceholder')}
                                  value={reviewDraft.comment}
                                  onChange={(e) => updateReviewDraft(reviewKey, { comment: e.target.value })}
                                  disabled={reviewDraft.submitted}
                                />
                                <button
                                  onClick={() => handleSubmitReview(activeOrder.id, item.product_id, reviewKey)}
                                  className="bg-gold text-charcoal px-3 py-1.5 rounded-luxury text-xs font-semibold hover:bg-gold-hover transition disabled:opacity-60 disabled:cursor-not-allowed"
                                  disabled={reviewDraft.submitted || submittingReviewKey === reviewKey}
                                >
                                  {reviewDraft.submitted ? t('reviews.submitted') : t('reviews.submit')}
                                </button>
                              </div>
                              <p className="text-[11px] text-charcoal-light mt-1">
                                {t('reviews.orderHint')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(activeOrder.redbox_tracking_number ||
                activeOrder.redbox_label_url ||
                activeOrder.redbox_status) && (
                <div className="border border-sand/70 rounded-xl p-4">
                  <h4 className="font-semibold text-charcoal mb-2">
                    {t('orders.trackingInfo', 'معلومات الشحنة')}
                  </h4>
                  <div className="space-y-2 text-sm text-charcoal">
                    {activeOrder.redbox_tracking_number && (
                      <p className="break-all">
                        {t('orders.trackingNumber', 'رقم التتبع')}:{" "}
                        <span className="font-semibold text-gold">
                          {activeOrder.redbox_tracking_number}
                        </span>
                      </p>
                    )}
                    {activeOrder.redbox_status && (
                      <p>
                        {t('orders.shipmentStatus', 'حالة الشحنة')}:{" "}
                        <span className="font-semibold">{activeOrder.redbox_status}</span>
                      </p>
                    )}
                    {(sellerMode || userIsAdmin) && (
                      <button
                        type="button"
                        onClick={() => handlePrintLabel(activeOrder.id)}
                        className="inline-flex items-center gap-2 text-charcoal underline hover:text-gold transition disabled:opacity-60"
                        disabled={printingLabel}
                      >
                        {printingLabel
                          ? t('orders.labelLoading', 'جاري تحميل البوليصة...')
                          : t('orders.printLabel', 'طباعة بوليصة الشحن')}
                        <span aria-hidden>↗</span>
                      </button>
                    )}
                    {activeOrder.redbox_label_url && (
                      <a
                        href={activeOrder.redbox_label_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-charcoal underline hover:text-gold transition"
                      >
                        {t('orders.downloadLabel', 'تحميل ملصق الشحنة')}
                        <span aria-hidden>↗</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {activeOrder.shipping_address && (
                <div className="border border-sand/70 rounded-xl p-4">
                  <h4 className="font-semibold text-charcoal mb-2">{t('orders.shippingAddress')}</h4>
                  <p className="text-sm text-charcoal-light whitespace-pre-line">{activeOrder.shipping_address}</p>
                </div>
              )}

              {!sellerMode && activeOrder.status === 'shipped' && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-charcoal">{t('orders.confirmDeliveryNote')}</div>
                  <button
                    onClick={async () => {
                      await api.post(`/orders/${activeOrder.id}/confirm-delivery`);
                      await fetchOrders();
                      setActiveOrder(null);
                      alert(t('orders.deliveryConfirmed'));
                    }}
                    className="bg-charcoal text-ivory px-4 py-2 rounded-luxury text-sm font-semibold hover:bg-charcoal-light transition"
                  >
                    {t('orders.confirmDelivery')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
