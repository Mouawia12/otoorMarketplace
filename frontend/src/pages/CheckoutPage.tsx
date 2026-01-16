import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import { formatPrice } from "../utils/currency";
import { clearPendingOrder, savePendingOrder, PendingOrderPayload } from "../utils/pendingOrder";

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

type LocationOption = {
  id: string;
  name: string;
  raw: any;
};

type PaymentMethod = {
  id: number;
  code?: string;
  nameEn?: string;
  nameAr?: string;
  serviceCharge?: number;
  totalAmount?: number;
  currency?: string;
  imageUrl?: string;
};

const extractList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const resolveOption = (item: any, lang: "ar" | "en"): LocationOption | null => {
  const id =
    item?.id ??
    item?.country_id ??
    item?.region_id ??
    item?.city_id ??
    item?.cities_id ??
    item?.district_id ??
    item?.courier_id ??
    item?.partner_id ??
    item?.shipping_company_id ??
    item?.company_id ??
    item?.code;

  const nameAr =
    item?.name_ar ??
    item?.nameAr ??
    item?.title_ar ??
    item?.titleAr ??
    item?.ar ??
    item?.district_name_ar ??
    item?.city_name_ar ??
    item?.region_name_ar ??
    item?.country_name_ar ??
    item?.company_name_ar ??
    item?.partner_name_ar;

  const nameEn =
    item?.name_en ??
    item?.nameEn ??
    item?.title_en ??
    item?.titleEn ??
    item?.en ??
    item?.district_name_en ??
    item?.city_name_en ??
    item?.region_name_en ??
    item?.country_name_en ??
    item?.company_name_en ??
    item?.partner_name_en;

  const fallback =
    item?.name ??
    item?.title ??
    item?.label ??
    item?.company_name ??
    item?.partner_name ??
    item?.district_name ??
    item?.city_name ??
    item?.region_name ??
    item?.country_name ??
    id;

  const name = (lang === "ar" ? nameAr : nameEn) ?? fallback;

  if (!id || !name) return null;
  return { id: String(id), name: String(name), raw: item };
};

const toOptions = (list: any[], lang: "ar" | "en") =>
  list
    .map((item) => resolveOption(item, lang))
    .filter(Boolean) as LocationOption[];

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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number | null>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [courierPartners, setCourierPartners] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCourier, setSelectedCourier] = useState("");
  const [locationsLoading, setLocationsLoading] = useState({
    countries: false,
    regions: false,
    cities: false,
    districts: false,
    partners: false,
  });
  const [locationsError, setLocationsError] = useState<string | null>(null);

  useEffect(() => {
    setCoupons([]);
    setCouponCode("");
    setCouponError("");
    setCouponSuccess("");
  }, [setCoupons]);

  useEffect(() => {
    setShipping("torod");
  }, [setShipping]);

  useEffect(() => {
    let active = true;
    const loadPaymentMethods = async () => {
      if (!Number.isFinite(total) || total <= 0) {
        setPaymentMethods([]);
        setSelectedPaymentMethodId(null);
        return;
      }
      try {
        setPaymentLoading(true);
        setPaymentError(null);
        const response = await api.post("/payments/myfatoorah/methods", {
          amount: total,
          currency: "SAR",
        });
        const methods = response.data?.methods ?? [];
        if (!active) return;
        setPaymentMethods(methods);
        setSelectedPaymentMethodId((prev) => {
          if (prev && methods.some((method: PaymentMethod) => method.id === prev)) {
            return prev;
          }
          return methods[0]?.id ?? null;
        });
      } catch (error: any) {
        if (!active) return;
        const msg = error?.response?.data?.message || error?.message;
        setPaymentError(msg ?? t("checkout.paymentMethodsFailed", "تعذّر تحميل طرق الدفع"));
        setPaymentMethods([]);
        setSelectedPaymentMethodId(null);
      } finally {
        if (active) setPaymentLoading(false);
      }
    };

    loadPaymentMethods();
    return () => {
      active = false;
    };
  }, [total, t]);

  const countryOptions = toOptions(countries, lang);
  const regionOptions = toOptions(regions, lang);
  const cityOptions = toOptions(cities, lang);
  const districtOptions = toOptions(districts, lang);
  const courierOptions = toOptions(courierPartners, lang);

  const setLoading = (
    key: "countries" | "regions" | "cities" | "districts" | "partners",
    value: boolean
  ) =>
    setLocationsLoading((prev) => ({
      ...prev,
      [key]: value,
    }));

  const findOptionName = (options: LocationOption[], id: string) =>
    options.find((option) => option.id === id)?.name ?? "";

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    phoneCode: "+966",
    address: "",
    city: "",
    paymentMethod: "myfatoorah" as "myfatoorah" | "cod",
  });

  useEffect(() => {
    let active = true;
    const loadCountries = async () => {
      try {
        setLoading("countries", true);
        setLocationsError(null);
        const response = await api.get("/torod/countries", { params: { page: 1 } });
        const list = extractList(response.data);
        if (!active) return;
        setCountries(list);
        if (!selectedCountry && list.length > 0) {
          const first = toOptions(list, lang)[0];
          if (first) setSelectedCountry(first.id);
        }
      } catch (error: any) {
        if (!active) return;
        const msg = error?.response?.data?.message || error?.message;
        setLocationsError(msg ?? t("checkout.locationsLoadFailed", "تعذّر تحميل بيانات العنوان"));
      } finally {
        if (active) setLoading("countries", false);
      }
    };

    loadCountries();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    setSelectedRegion("");
    setSelectedCity("");
    setSelectedDistrict("");
    setSelectedCourier("");
    setRegions([]);
    setCities([]);
    setDistricts([]);
    setCourierPartners([]);

    if (!selectedCountry) return undefined;

    const loadRegions = async () => {
      try {
        setLoading("regions", true);
        setLocationsError(null);
        const response = await api.get("/torod/regions", {
          params: { country_id: selectedCountry, page: 1 },
        });
        const list = extractList(response.data);
        if (!active) return;
        setRegions(list);
        const first = toOptions(list, lang)[0];
        if (first) setSelectedRegion(first.id);
      } catch (error: any) {
        if (!active) return;
        const msg = error?.response?.data?.message || error?.message;
        setLocationsError(msg ?? t("checkout.locationsLoadFailed", "تعذّر تحميل بيانات العنوان"));
      } finally {
        if (active) setLoading("regions", false);
      }
    };

    loadRegions();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]);

  useEffect(() => {
    let active = true;
    setSelectedCity("");
    setSelectedDistrict("");
    setSelectedCourier("");
    setCities([]);
    setDistricts([]);
    setCourierPartners([]);

    if (!selectedRegion) return undefined;

    const loadCities = async () => {
      try {
        setLoading("cities", true);
        setLocationsError(null);
        const response = await api.get("/torod/cities", {
          params: { region_id: selectedRegion, page: 1 },
        });
        const list = extractList(response.data);
        if (!active) return;
        setCities(list);
        const first = toOptions(list, lang)[0];
        if (first) setSelectedCity(first.id);
      } catch (error: any) {
        if (!active) return;
        const msg = error?.response?.data?.message || error?.message;
        setLocationsError(msg ?? t("checkout.locationsLoadFailed", "تعذّر تحميل بيانات العنوان"));
      } finally {
        if (active) setLoading("cities", false);
      }
    };

    loadCities();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion]);

  useEffect(() => {
    let active = true;
    setSelectedDistrict("");
    setSelectedCourier("");
    setDistricts([]);
    setCourierPartners([]);

    if (!selectedCity) return undefined;

    const loadDistrictsAndPartners = async () => {
      try {
        setLoading("districts", true);
        setLoading("partners", true);
        setLocationsError(null);
        const [districtsResponse, partnersResponse] = await Promise.all([
          api.get("/torod/districts", {
            params: { cities_id: selectedCity, page: 1 },
          }),
          api.get("/torod/courier-partners", {
            params: { city_id: selectedCity },
          }),
        ]);
        if (!active) return;
        const districtList = extractList(districtsResponse.data);
        const partnerList = extractList(partnersResponse.data);
        setDistricts(districtList);
        setCourierPartners(partnerList);
        const firstDistrict = toOptions(districtList, lang)[0];
        const firstPartner = toOptions(partnerList, lang)[0];
        if (firstDistrict) setSelectedDistrict(firstDistrict.id);
        if (firstPartner) setSelectedCourier(firstPartner.id);
      } catch (error: any) {
        if (!active) return;
        const msg = error?.response?.data?.message || error?.message;
        setLocationsError(msg ?? t("checkout.locationsLoadFailed", "تعذّر تحميل بيانات العنوان"));
      } finally {
        if (active) {
          setLoading("districts", false);
          setLoading("partners", false);
        }
      }
    };

    loadDistrictsAndPartners();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity]);

  useEffect(() => {
    const cityName = findOptionName(cityOptions, selectedCity);
    if (cityName && formData.city !== cityName) {
      setFormData((prev) => ({ ...prev, city: cityName }));
    }
  }, [cityOptions, formData.city, selectedCity]);

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
    if (!selectedCountry) newErrors.country = t('checkout.countryRequired', 'اختر الدولة');
    if (!selectedRegion) newErrors.region = t('checkout.regionRequired', 'اختر المنطقة');
    if (!selectedCity) newErrors.city = t('checkout.cityRequired');
    if (!selectedDistrict) newErrors.district = t('checkout.districtRequired', 'اختر الحي');
    if (courierOptions.length > 0 && !selectedCourier) {
      newErrors.courier = t('checkout.courierRequired', 'اختر شركة الشحن');
    }
    if (!formData.address.trim()) newErrors.address = t('checkout.addressRequired');
    if (formData.paymentMethod === "myfatoorah" && !selectedPaymentMethodId) {
      newErrors.payment = t('checkout.paymentMethodRequired', 'اختر طريقة الدفع');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildOrderPayload = (): PendingOrderPayload | null => {
    if (!validateForm()) {
      return null;
    }

    const countryName = findOptionName(countryOptions, selectedCountry);
    const regionName = findOptionName(regionOptions, selectedRegion);
    const cityName = findOptionName(cityOptions, selectedCity);
    const districtName = findOptionName(districtOptions, selectedDistrict);

    const metadata = {
      country_name: countryName || undefined,
      region_name: regionName || undefined,
      city_name: cityName || undefined,
      district_name: districtName || undefined,
    };
    const hasMetadata = Object.values(metadata).some(Boolean);
    const selectedPaymentMethod = paymentMethods.find(
      (method) => method.id === selectedPaymentMethodId
    );
    const isCodPayment = formData.paymentMethod === "cod";

    return {
      payment_method: isCodPayment ? "COD" : "MYFATOORAH",
      payment_method_id: !isCodPayment ? selectedPaymentMethod?.id : undefined,
      payment_method_code: !isCodPayment ? selectedPaymentMethod?.code : undefined,
      shipping: {
        name: formData.name,
        phone: `${formData.phoneCode} ${formData.phone}`.trim(),
        city: cityName || formData.city,
        region: regionName || cityName || formData.city,
        address: formData.address,
        type: "torod",
        shipping_method: "TOROD",
        customer_city_code: selectedCity,
        customer_country: countryName || "SA",
        torod_country_id: selectedCountry,
        torod_region_id: selectedRegion,
        torod_city_id: selectedCity,
        torod_district_id: selectedDistrict,
        torod_shipping_company_id: selectedCourier || undefined,
        torod_metadata: hasMetadata ? metadata : undefined,
        cod_amount: isCodPayment ? total : undefined,
        cod_currency: isCodPayment ? "SAR" : undefined,
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
      const paymentUrl = order.payment_url;
      if (paymentUrl) {
        clearPendingOrder();
        clear();
        window.location.href = paymentUrl;
        return;
      }
      const trackingNumber = order.torod_tracking_number;
      const labelUrl = order.torod_label_url;
      const torodStatus = order.torod_status;
      const params = new URLSearchParams({ orderId: String(order.id ?? "") });
      if (trackingNumber) params.set("tracking", trackingNumber);
      if (torodStatus) params.set("status", torodStatus);
      clearPendingOrder();
      clear();
      navigate(`/order/success?${params.toString()}`, {
        state: {
          trackingNumber,
          labelUrl,
          torodStatus,
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

                <div className="sm:col-span-1">
                  <label className="block text-charcoal font-semibold mb-2">{t('checkout.country')}</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    disabled={locationsLoading.countries}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.country ? 'border-red-500' : 'border-charcoal-light'
                    } focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px] disabled:bg-gray-100`}
                  >
                    {!selectedCountry && (
                      <option value="">{t('checkout.countryPlaceholder')}</option>
                    )}
                    {countryOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-charcoal font-semibold mb-2">{t('checkout.region')}</label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    disabled={!selectedCountry || locationsLoading.regions}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.region ? 'border-red-500' : 'border-charcoal-light'
                    } focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px] disabled:bg-gray-100`}
                  >
                    {!selectedRegion && (
                      <option value="">{t('checkout.regionPlaceholder')}</option>
                    )}
                    {regionOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {errors.region && <p className="text-red-500 text-sm mt-1">{errors.region}</p>}
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-charcoal font-semibold mb-2">{t('checkout.city')}</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={!selectedRegion || locationsLoading.cities}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.city ? 'border-red-500' : 'border-charcoal-light'
                    } focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px] disabled:bg-gray-100`}
                  >
                    {!selectedCity && (
                      <option value="">{t('checkout.cityPlaceholder')}</option>
                    )}
                    {cityOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-charcoal font-semibold mb-2">{t('checkout.district')}</label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    disabled={!selectedCity || locationsLoading.districts}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.district ? 'border-red-500' : 'border-charcoal-light'
                    } focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px] disabled:bg-gray-100`}
                  >
                    {!selectedDistrict && (
                      <option value="">{t('checkout.districtPlaceholder')}</option>
                    )}
                    {districtOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {errors.district && <p className="text-red-500 text-sm mt-1">{errors.district}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-charcoal font-semibold mb-2">{t('checkout.courierPartner')}</label>
                  <select
                    value={selectedCourier}
                    onChange={(e) => setSelectedCourier(e.target.value)}
                    disabled={!selectedCity || locationsLoading.partners}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.courier ? 'border-red-500' : 'border-charcoal-light'
                    } focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px] disabled:bg-gray-100`}
                  >
                    {!selectedCourier && (
                      <option value="">{t('checkout.courierPartnerPlaceholder')}</option>
                    )}
                    {courierOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {errors.courier && <p className="text-red-500 text-sm mt-1">{errors.courier}</p>}
                </div>

                <div className="sm:col-span-2">
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
                  {locationsError && (
                    <p className="text-red-500 text-sm mt-2">{locationsError}</p>
                  )}
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
                    checked={shipping === "torod"}
                    onChange={() => setShipping("torod")}
                    className="w-5 h-5 text-gold"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-charcoal">
                      {t("checkout.torodShipping", "شحن عبر طُرُد")}
                    </p>
                    <p className="text-sm text-taupe">
                      {t("checkout.torodShippingDesc", "يتم شحن طلبك عبر شركة طُرُد مع تتبع تلقائي.")}
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
              {paymentLoading && (
                <p className="text-sm text-taupe mb-4">
                  {t('checkout.paymentMethodsLoading', 'جارٍ تحميل طرق الدفع...')}
                </p>
              )}
              {paymentError && (
                <p className="text-sm text-red-500 mb-4">{paymentError}</p>
              )}
              {!paymentLoading && !paymentError && paymentMethods.length === 0 && (
                <p className="text-sm text-taupe mb-4">
                  {t('checkout.paymentMethodsUnavailable', 'لا توجد طرق دفع متاحة حالياً.')}
                </p>
              )}
              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const name =
                    lang === "ar"
                      ? method.nameAr || method.nameEn || method.code || `#${method.id}`
                      : method.nameEn || method.nameAr || method.code || `#${method.id}`;
                  const isSelected =
                    formData.paymentMethod === "myfatoorah" &&
                    selectedPaymentMethodId === method.id;
                  return (
                    <label
                      key={method.id}
                      className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition ${
                        isSelected ? "border-gold bg-gold/10" : "border-charcoal-light"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={isSelected}
                        onChange={() => {
                          setFormData((prev) => ({ ...prev, paymentMethod: "myfatoorah" }));
                          setSelectedPaymentMethodId(method.id);
                        }}
                        className="w-5 h-5 text-gold"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-charcoal">{name}</p>
                        {typeof method.serviceCharge === "number" && (
                          <p className="text-xs text-taupe">
                            {t('checkout.paymentServiceFee', 'رسوم الخدمة')}:{" "}
                            {formatPrice(method.serviceCharge, lang)}
                          </p>
                        )}
                      </div>
                      {method.imageUrl && (
                        <img
                          src={method.imageUrl}
                          alt={name}
                          className="h-8 w-auto object-contain"
                          loading="lazy"
                        />
                      )}
                    </label>
                  );
                })}

                <label
                  className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition ${
                    formData.paymentMethod === "cod"
                      ? "border-gold bg-gold/10"
                      : "border-charcoal-light"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={formData.paymentMethod === "cod"}
                    onChange={() => setFormData((prev) => ({ ...prev, paymentMethod: "cod" }))}
                    className="w-5 h-5 text-gold"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-charcoal">
                      {t('checkout.cashOnDelivery', 'الدفع عند الاستلام')}
                    </p>
                    <p className="text-xs text-taupe">
                      {t('checkout.codNote', 'يتم تحصيل قيمة الطلب عند التسليم')}
                    </p>
                  </div>
                </label>
              </div>
              {errors.payment && <p className="text-red-500 text-sm mt-3">{errors.payment}</p>}
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
