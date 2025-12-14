import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import { formatPrice } from "../utils/currency";
import { clearPendingOrder, savePendingOrder, PendingOrderPayload } from "../utils/pendingOrder";
import type { BankTransferSettings } from "../types";

const dialCodeOptions = [
  { code: "+966", country: "Saudi Arabia", label: "🇸🇦 Saudi Arabia (+966)" },
  { code: "+971", country: "United Arab Emirates", label: "🇦🇪 United Arab Emirates (+971)" },
  { code: "+965", country: "Kuwait", label: "🇰🇼 Kuwait (+965)" },
  { code: "+974", country: "Qatar", label: "🇶🇦 Qatar (+974)" },
  { code: "+973", country: "Bahrain", label: "🇧🇭 Bahrain (+973)" },
  { code: "+968", country: "Oman", label: "🇴🇲 Oman (+968)" },
  { code: "+20", country: "Egypt", label: "🇪🇬 Egypt (+20)" },
  { code: "+962", country: "Jordan", label: "🇯🇴 Jordan (+962)" },
  { code: "+961", country: "Lebanon", label: "🇱🇧 Lebanon (+961)" },
  { code: "+90", country: "Turkey", label: "🇹🇷 Turkey (+90)" },
  { code: "+44", country: "United Kingdom", label: "🇬🇧 United Kingdom (+44)" },
  { code: "+1", country: "United States", label: "🇺🇸 United States (+1)" },
];

const normalizeDigits = (value: string) => value.replace(/[^\d]/g, "");

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
  const [bankSettings, setBankSettings] = useState<BankTransferSettings | null>(null);

  useEffect(() => {
    setCoupon(null);
    setCouponCode("");
    setCouponError("");
    setCouponSuccess("");
  }, [setCoupon]);

  useEffect(() => {
    const loadBankSettings = async () => {
      try {
        const response = await api.get<BankTransferSettings>("/settings/bank-transfer");
        setBankSettings(response.data);
      } catch (error) {
        console.error("Failed to load bank settings", error);
      }
    };
    loadBankSettings();
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    phoneCode: "+966",
    city: "",
    address: "",
    paymentMethod: "cod" as "card" | "applepay" | "mada" | "cod" | "bank",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placingOrder, setPlacingOrder] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resolvedBankSettings = {
    bankName: bankSettings?.bankName ?? t('checkout.bankNameValue', 'مصرف الراجحي'),
    accountName: bankSettings?.accountName ?? t('checkout.accountNameValue', 'شركة عالم العطور للتجارة'),
    iban: bankSettings?.iban ?? 'SA00 0000 0000 0000 0000 0000',
    swift: bankSettings?.swift ?? 'RJHISARI',
    instructions:
      bankSettings?.instructions ??
      t(
        'checkout.bankInstructions',
        'يرجى تحويل المبلغ خلال ٢٤ ساعة ومشاركة إيصال التحويل مع فريق الدعم ليتم تأكيد الطلب وشحنه.'
      ),
  };

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
    if (!formData.phone.trim()) {
      newErrors.phone = t('checkout.phoneRequired');
    } else if (formData.phone.trim().length < 8) {
      newErrors.phone = t('checkout.phoneInvalid', 'أدخل رقم هاتف صالح');
    }
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
        phone: `${formData.phoneCode} ${formData.phone}`.trim(),
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
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="sm:w-40">
                      <input
                        list="dial-code-options"
                        value={formData.phoneCode}
                        onChange={(e) => {
                          const inputValue = e.target.value.trim();
                          const cleaned = inputValue.replace(/[^\d+]/g, "");
                          const normalized = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
                          setFormData((prev) => ({ ...prev, phoneCode: normalized || "+966" }));
                        }}
                        className="w-full px-4 py-3 rounded-lg border border-charcoal-light focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px]"
                        placeholder="+966"
                      />
                    </div>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: normalizeDigits(e.target.value) }))}
                      className={`flex-1 px-4 py-3 rounded-lg border ${
                        errors.phone ? 'border-red-500' : 'border-charcoal-light'
                      } focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px]`}
                      placeholder={t('checkout.phonePlaceholder')}
                    />
                  </div>
                  <datalist id="dial-code-options">
                    {dialCodeOptions.map((option) => (
                      <option key={option.code} value={option.code} label={option.label} />
                    ))}
                  </datalist>
                  <p className="text-xs text-taupe mt-1">{t('checkout.phoneHint', 'اختر رمز الدولة ثم أدخل أرقام الهاتف فقط')}</p>
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

                <label
                  className={`flex flex-col gap-2 p-4 border rounded-lg cursor-pointer transition ${
                    formData.paymentMethod === "bank" ? "border-gold bg-gold/10" : "border-charcoal-light"
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={formData.paymentMethod === "bank"}
                        onChange={() => setFormData({ ...formData, paymentMethod: "bank" })}
                        className="w-5 h-5 text-gold"
                      />
                      <div>
                        <p className="font-semibold text-charcoal">{t("checkout.bankTransfer", "التحويل البنكي")}</p>
                        <p className="text-xs text-charcoal-light">
                          {t("checkout.bankTransferEta", "يتم تأكيد الطلب بعد استلام الحوالة المصرفية")}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-taupe">{t("checkout.noFees", "بدون رسوم إضافية")}</span>
                  </div>
                  {formData.paymentMethod === "bank" && (
                    <div className="text-sm text-charcoal bg-white rounded-xl border border-gold/40 p-3 space-y-1">
                      <p>
                        <strong>{t("checkout.bankNameLabel", "اسم البنك")}:</strong> {resolvedBankSettings.bankName}
                      </p>
                      <p>
                        <strong>{t("checkout.accountName", "اسم المستفيد")}:</strong> {resolvedBankSettings.accountName}
                      </p>
                      <p>
                        <strong>{t("checkout.iban", "رقم الآيبان")}:</strong> {resolvedBankSettings.iban}
                      </p>
                      <p>
                        <strong>{t("checkout.swift", "سويفت كود")}:</strong> {resolvedBankSettings.swift}
                      </p>
                      <p className="text-[13px] text-taupe leading-5 whitespace-pre-line">
                        {resolvedBankSettings.instructions}
                      </p>
                    </div>
                  )}
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
