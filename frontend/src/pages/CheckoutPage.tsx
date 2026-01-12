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

const formatPointAddress = (point: any, lang: "ar" | "en") => {
  const raw =
    (lang === "ar" ? point.address_ar : point.address) ??
    (lang === "ar" ? point.address : point.address_ar) ??
    point.address ??
    point.point_address ??
    point.full_address ??
    "";

  if (!raw) return "";

  if (typeof raw === "string") {
    return raw;
  }

  if (typeof raw === "object") {
    const address = raw as Record<string, unknown>;
    const parts = [address.street, address.district, address.city]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .map((value) => String(value).trim());
    const separator = lang === "ar" ? "، " : ", ";
    return parts.length > 0 ? parts.join(separator) : "";
  }

  return String(raw);
};

export default function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { items, shipping, setShipping, coupons, setCoupons, totals, clear } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { sub, discount, shipping: shippingCost, total } = totals();
  const lang = i18n.language as 'ar' | 'en';

  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [bankSettings, setBankSettings] = useState<BankTransferSettings | null>(null);
  const [redboxCities, setRedboxCities] = useState<Array<{ code: string; name: string }>>([]);
  const [redboxPoints, setRedboxPoints] = useState<
    Array<{ id: string; name: string; address?: string }>
  >([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedPoint, setSelectedPoint] = useState("");
  const [redboxLoading, setRedboxLoading] = useState(false);
  const [redboxError, setRedboxError] = useState<string | null>(null);

  useEffect(() => {
    setCoupons([]);
    setCouponCode("");
    setCouponError("");
    setCouponSuccess("");
  }, [setCoupons]);

  useEffect(() => {
    setShipping("redbox");
  }, [setShipping]);

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

  useEffect(() => {
    const loadCities = async () => {
      try {
        setRedboxLoading(true);
        const response = await api.get("/shipping/redbox/cities");
        const raw = response.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.cities)
          ? raw.cities
          : [];

        const normalized = list
          .map((city: any) => {
            const code = city.code || city.city_code || city.cityCode || city.id || city.Code;
            const localizedName =
              (lang === "ar"
                ? city.ar || city.name_ar || city.city_name_ar
                : city.en || city.name_en || city.city_name_en) ??
              (city.name ||
                city.city_name ||
                city.cityName ||
                city.title ||
                code);
            if (!code || !localizedName) return null;
            return { code: String(code), name: String(localizedName) };
          })
          .filter(Boolean) as Array<{ code: string; name: string }>;

        setRedboxCities(normalized);
        if (normalized.length > 0 && !selectedCity) {
          setSelectedCity(normalized[0].code);
        }
      } catch (error) {
        console.error("Failed to load RedBox cities", error);
        const msg = (error as any)?.response?.data?.message || (error as any)?.message;
        setRedboxError(msg ?? t("checkout.redboxLoadFailed", "تعذّر تحميل مدن RedBox"));
      } finally {
        setRedboxLoading(false);
      }
    };

    loadCities();
  }, [t, lang]);

  useEffect(() => {
    if (selectedPoint) {
      const point = redboxPoints.find((p) => p.id === selectedPoint);
      if (point) {
        setFormData((prev) => ({
          ...prev,
          address: point.address || point.name,
        }));
      }
    }
  }, [selectedPoint, redboxPoints]);

  useEffect(() => {
    const loadPoints = async () => {
      if (!selectedCity) return;
      try {
        setRedboxLoading(true);
        setRedboxError(null);
        const response = await api.get("/shipping/redbox/points", {
          params: { city_code: selectedCity },
        });
        const raw = response.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.points)
          ? raw.points
          : [];
        const normalized = list
          .map((point: any) => {
            const id =
              point.point_id ||
              point.pointId ||
              point.id ||
              point.code ||
              point.point_code ||
              point.pointCode;
            const localizedName =
              (lang === "ar"
                ? point.host_name_ar ||
                  point.name_ar ||
                  point.point_name_ar ||
                  point.ar
                : point.host_name_en ||
                  point.name_en ||
                  point.point_name_en ||
                  point.en) ??
              (point.host_name ||
                point.point_name ||
                point.name ||
                point.pointName ||
                point.label ||
                id);
            const address =
              formatPointAddress(point, lang) ||
              (typeof point.location === "string" ? point.location : "") ||
              "";
            if (!id || !localizedName) return null;
            return {
              id: String(id),
              name: String(localizedName),
              address: address ? String(address) : undefined,
            };
          })
          .filter(Boolean) as Array<{ id: string; name: string; address?: string }>;

        setRedboxPoints(normalized);
        if (normalized.length > 0) {
          setSelectedPoint(normalized[0].id);
          setFormData((prev) => ({
            ...prev,
            address: normalized[0].address ?? normalized[0].name,
          }));
        } else {
          setSelectedPoint("");
        }
      } catch (error) {
        console.error("Failed to load RedBox points", error);
        const msg = (error as any)?.response?.data?.message || (error as any)?.message;
        setRedboxError(msg ?? t("checkout.redboxPointsFailed", "تعذّر تحميل نقاط RedBox"));
      } finally {
        setRedboxLoading(false);
      }
    };

    loadPoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, lang]);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    phoneCode: "+966",
    address: "",
    city: "",
    paymentMethod: "bank" as "card" | "applepay" | "mada" | "cod" | "bank",
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

    const newCode = couponCode.trim().toUpperCase();
    if (coupons.some((coupon) => coupon.code.toUpperCase() === newCode)) {
      setCouponError(t('checkout.couponAlreadyApplied', 'هذا الكوبون مضاف بالفعل'));
      return;
    }

    setCouponLoading(true);
    setCouponError("");
    setCouponSuccess("");

    try {
      const codes = [...coupons.map((coupon) => coupon.code), newCode];
      const response = await api.post("/coupons/validate", {
        codes,
        items: buildCouponItemsPayload(),
      });
      const payload = response.data;
      const validatedCoupons = Array.isArray(payload.coupons) ? payload.coupons : [];
      const nextCoupons = validatedCoupons.map((entry: any) => ({
        code: entry.coupon.code,
        amount: Number(entry.discount_amount ?? 0),
        meta: {
          discount_type: entry.coupon.discount_type,
          discount_value: Number(entry.coupon.discount_value),
          seller_id: entry.coupon.seller_id ?? null,
        },
      }));
      setCoupons(nextCoupons);
      setCouponSuccess(t('checkout.couponApplied'));
      setCouponCode("");
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
    if (!formData.address.trim()) newErrors.address = t('checkout.addressRequired');
    if (!selectedCity) newErrors.redboxCity = t("checkout.redboxCityRequired", "اختر مدينة RedBox");
    if (!selectedPoint) newErrors.redboxPoint = t("checkout.redboxPointRequired", "اختر نقطة استلام RedBox");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildOrderPayload = (): PendingOrderPayload | null => {
    if (!validateForm()) {
      return null;
    }

    const cityName =
      redboxCities.find((city) => city.code === selectedCity)?.name ||
      selectedCity;

    return {
      payment_method: formData.paymentMethod.toUpperCase(),
      shipping: {
        name: formData.name,
        phone: `${formData.phoneCode} ${formData.phone}`.trim(),
        city: cityName,
        region: cityName,
        address: formData.address || selectedPoint,
        type: "redbox",
        shipping_method: "REDBOX",
        redbox_point_id: selectedPoint,
        customer_city_code: selectedCity,
        redbox_city_code: selectedCity,
        customer_country: "SA",
        cod_amount: formData.paymentMethod === "cod" ? total : 0,
        cod_currency: "SAR",
      },
      items: items.map((item) => ({
        productId: Number(item.id),
        quantity: item.qty,
        unitPrice: item.price,
      })),
      coupon_codes: coupons.length > 0 ? coupons.map((coupon) => coupon.code) : undefined,
    };
  };

  const submitOrder = async (payload: PendingOrderPayload) => {
    try {
      setPlacingOrder(true);
      setSubmitError(null);
      const response = await api.post("/orders", payload);
      const order = response.data ?? {};
      const trackingNumber = order.redbox_tracking_number;
      const labelUrl = order.redbox_label_url;
      const redboxStatus = order.redbox_status;
      const params = new URLSearchParams({ orderId: String(order.id ?? "") });
      if (trackingNumber) params.set("tracking", trackingNumber);
      if (redboxStatus) params.set("status", redboxStatus);
      clearPendingOrder();
      clear();
      navigate(`/order/success?${params.toString()}`, {
        state: {
          trackingNumber,
          labelUrl,
          redboxStatus,
        },
      });
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

                <div className="sm:col-span-2 border border-gold/40 bg-white rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-charcoal font-semibold">
                        {t("checkout.redboxPickup", "استلام من نقطة RedBox (إلزامي)")}
                      </p>
                      <p className="text-sm text-taupe">
                        {t("checkout.redboxHint", "اختر المدينة ثم نقطة الاستلام الأقرب لك.")}
                      </p>
                    </div>
                    {redboxLoading && (
                      <span className="text-sm text-gold">{t("common.loading")}</span>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-charcoal font-semibold mb-2">
                        {t("checkout.redboxCity", "مدينة الاستلام")}
                      </label>
                      <select
                        value={selectedCity}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSelectedCity(value);
                          setSelectedPoint("");
                          setFormData((prev) => ({ ...prev, address: "" }));
                        }}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          errors.redboxCity ? "border-red-500" : "border-charcoal-light"
                        } focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px]`}
                      >
                        {!selectedCity && <option value="">{t("checkout.selectCity", "اختر المدينة")}</option>}
                        {redboxCities.map((city) => (
                          <option key={city.code} value={city.code}>
                            {city.name}
                          </option>
                        ))}
                      </select>
                      {errors.redboxCity && (
                        <p className="text-red-500 text-sm mt-1">{errors.redboxCity}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-charcoal font-semibold mb-2">
                        {t("checkout.redboxPoint", "نقطة الاستلام")}
                      </label>
                      <select
                        value={selectedPoint}
                        disabled={!selectedCity || redboxLoading}
                        onChange={(e) => {
                          const pointId = e.target.value;
                          setSelectedPoint(pointId);
                          const point = redboxPoints.find((p) => p.id === pointId);
                          if (point) {
                            setFormData((prev) => ({
                              ...prev,
                              address: point.address || point.name,
                              city: prev.city || point.name,
                            }));
                          }
                        }}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          errors.redboxPoint ? "border-red-500" : "border-charcoal-light"
                        } focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px] disabled:bg-gray-100`}
                      >
                        {!selectedPoint && <option value="">{t("checkout.selectPoint", "اختر نقطة الاستلام")}</option>}
                        {redboxPoints.map((point) => (
                          <option key={point.id} value={point.id}>
                            {point.name}
                          </option>
                        ))}
                      </select>
                      {errors.redboxPoint && (
                        <p className="text-red-500 text-sm mt-1">{errors.redboxPoint}</p>
                      )}
                      {redboxError && (
                        <p className="text-red-500 text-sm mt-1">{redboxError}</p>
                      )}
                    </div>
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
            </div>

            {/* Shipping Method */}
            <div className="bg-ivory rounded-luxury p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-charcoal mb-6">{t('checkout.shipping')}</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-4 p-4 border border-gold rounded-lg cursor-pointer bg-white hover:bg-sand transition">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shipping === "redbox"}
                    onChange={() => setShipping("redbox")}
                    className="w-5 h-5 text-gold"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-charcoal">
                      {t("checkout.redboxShipping", "استلام من نقطة RedBox")}
                    </p>
                    <p className="text-sm text-taupe">
                      {t("checkout.redboxShippingDesc", "مطلوب اختيار نقطة RedBox قبل إتمام الطلب.")}
                    </p>
                  </div>
                  <p className="font-bold text-gold">{t('checkout.free')}</p>
                </label>

                <label className="flex items-center gap-4 p-4 border border-charcoal-light rounded-lg cursor-pointer hover:bg-sand transition">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shipping === "standard"}
                    onChange={() => setShipping("standard")}
                    className="w-5 h-5 text-gold"
                    disabled
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-charcoal">{t('checkout.standardShipping')}</p>
                    <p className="text-sm text-taupe">
                      {t('checkout.standardShippingDesc')} ({t("checkout.unavailableNow", "غير متاحة حالياً")})
                    </p>
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
                    disabled
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-charcoal">{t('checkout.expressShipping')}</p>
                    <p className="text-sm text-taupe">
                      {t('checkout.expressShippingDesc')} ({t("checkout.unavailableNow", "غير متاحة حالياً")})
                    </p>
                  </div>
                  <p className="font-bold text-gold">{formatPrice(35, lang)}</p>
                </label>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-ivory rounded-luxury p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-charcoal mb-6">{t('checkout.payment')}</h2>
              <div className="space-y-3">
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
                        <img src={item.image} alt={item.name} className="w-full h-full object-contain bg-white" />
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
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading}
                    className="px-4 py-2 bg-charcoal text-ivory rounded-lg hover:bg-charcoal-light transition font-semibold min-h-[44px] disabled:opacity-50"
                  >
                    {couponLoading ? "..." : t('checkout.apply')}
                  </button>
                </div>
                {couponSuccess && coupons.length > 0 && (
                  <p className="text-green-600 text-sm mt-2">
                    {couponSuccess}
                  </p>
                )}
                {couponError && <p className="text-red-500 text-sm mt-2">{couponError}</p>}
                {coupons.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {coupons.map((coupon) => (
                      <div key={coupon.code} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-sand">
                        <span className="font-semibold text-charcoal">{coupon.code}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-green-600">
                            -{formatPrice(coupon.amount, lang)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const remaining = coupons.filter((c) => c.code !== coupon.code);
                              if (remaining.length === 0) {
                                setCoupons([]);
                                setCouponError("");
                                setCouponSuccess("");
                                return;
                              }
                              setCouponLoading(true);
                              api.post("/coupons/validate", {
                                codes: remaining.map((c) => c.code),
                                items: buildCouponItemsPayload(),
                              })
                                .then((response) => {
                                  const payload = response.data;
                                  const validatedCoupons = Array.isArray(payload.coupons)
                                    ? payload.coupons
                                    : [];
                                  const nextCoupons = validatedCoupons.map((entry: any) => ({
                                    code: entry.coupon.code,
                                    amount: Number(entry.discount_amount ?? 0),
                                    meta: {
                                      discount_type: entry.coupon.discount_type,
                                      discount_value: Number(entry.coupon.discount_value),
                                      seller_id: entry.coupon.seller_id ?? null,
                                    },
                                  }));
                                  setCoupons(nextCoupons);
                                  setCouponError("");
                                })
                                .catch((error: any) => {
                                  const apiMessage = error?.response?.data?.message || error?.response?.data?.detail;
                                  setCouponError(apiMessage ?? t('checkout.invalidCoupon'));
                                })
                                .finally(() => setCouponLoading(false));
                            }}
                            className="text-red-500 hover:text-red-600 transition"
                          >
                            {t('checkout.remove')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
