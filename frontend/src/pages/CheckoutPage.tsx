import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import { formatPrice } from "../utils/currency";
import { clearPendingOrder, savePendingOrder, PendingOrderPayload } from "../utils/pendingOrder";

export default function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { items, shipping, setShipping, coupon, setCoupon, totals, clear } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { sub, discount, shipping: shippingCost, total } = totals();
  const lang = i18n.language as 'ar' | 'en';

  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    city: "",
    address: "",
    paymentMethod: "cod" as "card" | "applepay" | "mada" | "cod",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placingOrder, setPlacingOrder] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const buildCouponItemsPayload = () =>
    items.map((item) => ({
      product_id: Number(item.id),
      quantity: item.qty,
    }));

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError(t('checkout.couponRequired'));
      return;
    }
    if (items.length === 0) {
      setCouponError(t('checkout.emptyCart'));
      return;
    }

    setCouponLoading(true);
    setCouponError("");
    setCouponSuccess("");

    try {
      const response = await api.post("/coupons/validate", {
        code: couponCode.toUpperCase(),
        items: buildCouponItemsPayload(),
      });
      const payload = response.data;
      const couponData = payload.coupon;
      const discountAmount = Number(payload.discount_amount ?? 0);
      setCoupon({
        code: couponData.code,
        amount: discountAmount,
        meta: {
          discount_type: couponData.discount_type,
          discount_value: Number(couponData.discount_value),
          seller_id: couponData.seller_id ?? null,
        },
      });
      setCouponSuccess(t('checkout.couponApplied'));
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message || error?.response?.data?.detail;
      setCouponError(apiMessage ?? t('checkout.invalidCoupon'));
    } finally {
      setCouponLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = t('checkout.nameRequired');
    if (!formData.phone.trim()) newErrors.phone = t('checkout.phoneRequired');
    if (!formData.city.trim()) newErrors.city = t('checkout.cityRequired');
    if (!formData.address.trim()) newErrors.address = t('checkout.addressRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildOrderPayload = (): PendingOrderPayload | null => {
    if (!validateForm()) {
      return null;
    }

    return {
      payment_method: formData.paymentMethod.toUpperCase(),
      shipping: {
        name: formData.name,
        phone: formData.phone,
        city: formData.city,
        region: formData.city,
        address: formData.address,
        type: shipping,
      },
      items: items.map((item) => ({
        productId: Number(item.id),
        quantity: item.qty,
        unitPrice: item.price,
      })),
      coupon_code: coupon?.code ?? undefined,
    };
  };

  const submitOrder = async (payload: PendingOrderPayload) => {
    try {
      setPlacingOrder(true);
      setSubmitError(null);
      const response = await api.post("/orders", payload);
      clearPendingOrder();
      clear();
      navigate(`/order/success?orderId=${response.data.id}`);
    } catch (error: any) {
      console.error("Failed to place order", error);
      const apiMessage = error?.response?.data?.message || error?.response?.data?.detail;
      setSubmitError(apiMessage ?? t('checkout.orderFailed', 'Failed to place order'));
    } finally {
      setPlacingOrder(false);
    }
  };

  const handlePlaceOrder = async () => {
    const payload = buildOrderPayload();
    if (!payload) return;

    if (!isAuthenticated) {
      savePendingOrder(payload);
      navigate('/login?redirect=/checkout');
      return;
    }

    await submitOrder(payload);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-sand py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xl text-taupe mb-8">{t('checkout.emptyCart')}</p>
            <button
              onClick={() => navigate('/new')}
              className="bg-gold text-charcoal px-8 py-4 rounded-luxury hover:bg-gold-hover transition font-semibold"
            >
              {t('cart.continueShopping')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-charcoal mb-8">{t('checkout.title')}</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Information */}
            <div className="bg-ivory rounded-luxury p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-charcoal mb-6">{t('checkout.delivery')}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-charcoal font-semibold mb-2">{t('checkout.fullName')}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.name ? 'border-red-500' : 'border-charcoal-light'
                    } focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px]`}
                    placeholder={t('checkout.fullNamePlaceholder')}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-charcoal font-semibold mb-2">{t('checkout.phone')}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.phone ? 'border-red-500' : 'border-charcoal-light'
                    } focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px]`}
                    placeholder={t('checkout.phonePlaceholder')}
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t('checkout.city')}</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.city ? 'border-red-500' : 'border-charcoal-light'
                    } focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px]`}
                    placeholder={t('checkout.cityPlaceholder')}
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t('checkout.address')}</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.address ? 'border-red-500' : 'border-charcoal-light'
                    } focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px]`}
                    placeholder={t('checkout.addressPlaceholder')}
                  />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>
              </div>
            </div>

            {/* Shipping Method */}
            <div className="bg-ivory rounded-luxury p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-charcoal mb-6">{t('checkout.shipping')}</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-4 p-4 border border-charcoal-light rounded-lg cursor-pointer hover:bg-sand transition">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shipping === "standard"}
                    onChange={() => setShipping("standard")}
                    className="w-5 h-5 text-gold"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-charcoal">{t('checkout.standardShipping')}</p>
                    <p className="text-sm text-taupe">{t('checkout.standardShippingDesc')}</p>
                  </div>
                  <p className="font-bold text-gold">{t('checkout.free')}</p>
                </label>

                <label className="flex items-center gap-4 p-4 border border-charcoal-light rounded-lg cursor-pointer hover:bg-sand transition">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shipping === "express"}
                    onChange={() => setShipping("express")}
                    className="w-5 h-5 text-gold"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-charcoal">{t('checkout.expressShipping')}</p>
                    <p className="text-sm text-taupe">{t('checkout.expressShippingDesc')}</p>
                  </div>
                  <p className="font-bold text-gold">{formatPrice(35, lang)}</p>
                </label>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-ivory rounded-luxury p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-charcoal mb-6">{t('checkout.payment')}</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-4 p-4 border border-charcoal-light rounded-lg cursor-pointer hover:bg-sand transition">
                  <input
                    type="radio"
                    name="payment"
                    checked={formData.paymentMethod === "cod"}
                    onChange={() => setFormData({ ...formData, paymentMethod: "cod" })}
                    className="w-5 h-5 text-gold"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-charcoal">{t('checkout.cashOnDelivery')}</p>
                  </div>
                </label>

                <label className="flex items-center gap-4 p-4 border border-charcoal-light rounded-lg cursor-pointer hover:bg-sand transition opacity-50">
                  <input
                    type="radio"
                    name="payment"
                    checked={formData.paymentMethod === "card"}
                    onChange={() => setFormData({ ...formData, paymentMethod: "card" })}
                    className="w-5 h-5 text-gold"
                    disabled
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-charcoal">{t('checkout.creditCard')}</p>
                    <p className="text-sm text-taupe">{t('checkout.comingSoon')}</p>
                  </div>
                </label>

                <label className="flex items-center gap-4 p-4 border border-charcoal-light rounded-lg cursor-pointer hover:bg-sand transition opacity-50">
                  <input
                    type="radio"
                    name="payment"
                    checked={formData.paymentMethod === "mada"}
                    onChange={() => setFormData({ ...formData, paymentMethod: "mada" })}
                    className="w-5 h-5 text-gold"
                    disabled
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-charcoal">{t('checkout.mada')}</p>
                    <p className="text-sm text-taupe">{t('checkout.comingSoon')}</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-ivory rounded-luxury p-6 shadow-sm sticky top-24">
              <h2 className="text-2xl font-bold text-charcoal mb-6">{t('checkout.orderSummary')}</h2>

              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div key={`${item.id}-${item.variantId || 'default'}`} className="flex gap-3">
                    <div className="w-16 h-16 bg-sand rounded-lg flex-shrink-0 overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-taupe" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-charcoal truncate">{item.name}</p>
                      <p className="text-xs text-taupe">{t('cart.qty')}: {item.qty}</p>
                      <p className="text-sm font-bold text-gold">{formatPrice(item.price * item.qty, lang)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="mb-6 pb-6 border-b border-charcoal-light">
                <label className="block text-charcoal font-semibold mb-2">{t('checkout.coupon')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-2 rounded-lg border border-charcoal-light focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px]"
                    placeholder={t('checkout.couponPlaceholder')}
                    disabled={!!coupon}
                  />
                  {coupon ? (
                    <button
                      onClick={() => {
                        setCoupon(null);
                        setCouponCode("");
                        setCouponError("");
                        setCouponSuccess("");
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold min-h-[44px]"
                    >
                      {t('checkout.remove')}
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                      className="px-4 py-2 bg-charcoal text-ivory rounded-lg hover:bg-charcoal-light transition font-semibold min-h-[44px] disabled:opacity-50"
                    >
                      {couponLoading ? "..." : t('checkout.apply')}
                    </button>
                  )}
                </div>
                {couponSuccess && coupon && (
                  <p className="text-green-600 text-sm mt-2">
                    {couponSuccess}: {coupon.code} (-{formatPrice(discount, lang)})
                  </p>
                )}
                {couponError && <p className="text-red-500 text-sm mt-2">{couponError}</p>}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-charcoal">
                  <span>{t('cart.subtotal')}:</span>
                  <span className="font-semibold">{formatPrice(sub, lang)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{t('checkout.discount')}:</span>
                    <span className="font-semibold">-{formatPrice(discount, lang)}</span>
                  </div>
                )}
                <div className="flex justify-between text-charcoal">
                  <span>{t('cart.shipping')}:</span>
                  <span className="font-semibold">
                    {shippingCost > 0 ? formatPrice(shippingCost, lang) : t('checkout.free')}
                  </span>
                </div>
                <div className="border-t border-charcoal-light pt-3">
                  <div className="flex justify-between text-charcoal text-xl font-bold">
                    <span>{t('cart.total')}:</span>
                    <span className="text-gold">{formatPrice(total, lang)}</span>
                  </div>
                </div>
              </div>

              {submitError && (
                <p className="text-red-600 text-sm mb-4">{submitError}</p>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="w-full bg-gold text-charcoal py-4 rounded-luxury hover:bg-gold-hover transition font-bold text-lg disabled:opacity-60"
              >
                {placingOrder ? t('common.loading') : t('checkout.placeOrder')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
