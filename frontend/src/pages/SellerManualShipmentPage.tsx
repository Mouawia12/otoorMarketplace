import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useTranslation } from "react-i18next";

type Partner = {
  id: number;
  name?: string;
  name_ar?: string;
  rate?: number | null;
  currency?: string | null;
  eta?: string | null;
};

type WarehouseOption = {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  cityId?: number | null;
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

const resolveOption = (item: any, lang: "ar" | "en" | "fr") => {
  const id =
    item?.id ??
    item?.country_id ??
    item?.region_id ??
    item?.city_id ??
    item?.district_id ??
    item?.cities_id;

  const nameAr =
    item?.name_ar ??
    item?.nameAr ??
    item?.title_ar ??
    item?.titleAr ??
    item?.district_name_ar ??
    item?.city_name_ar ??
    item?.region_name_ar ??
    item?.country_name_ar;
  const nameEn =
    item?.name_en ??
    item?.nameEn ??
    item?.title_en ??
    item?.titleEn ??
    item?.district_name_en ??
    item?.city_name_en ??
    item?.region_name_en ??
    item?.country_name_en;
  const nameFr =
    item?.name_fr ??
    item?.nameFr ??
    item?.title_fr ??
    item?.titleFr ??
    item?.district_name_fr ??
    item?.city_name_fr ??
    item?.region_name_fr ??
    item?.country_name_fr;

  const fallback =
    item?.name ??
    item?.country_name ??
    item?.region_name ??
    item?.city_name ??
    item?.district_name ??
    item?.title ??
    item?.label ??
    item?.value ??
    id;

  const label =
    (lang === "ar" ? nameAr : lang === "fr" ? nameFr : nameEn) ?? fallback;
  if (!id) return null;
  return { id: Number(id), label: String(label) };
};

const getLocalizedName = (item: any, lang: "ar" | "en" | "fr") => {
  if (!item) return "";
  const nameAr = item.name_ar ?? item.nameAr ?? item.title_ar ?? item.titleAr;
  const nameEn = item.name_en ?? item.nameEn ?? item.title_en ?? item.titleEn;
  const nameFr = item.name_fr ?? item.nameFr ?? item.title_fr ?? item.titleFr;
  const fallback = item.name ?? item.title ?? "";
  return (lang === "ar" ? nameAr : lang === "fr" ? nameFr : nameEn) ?? fallback;
};

export default function SellerManualShipmentPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language?.startsWith("ar")
    ? "ar"
    : i18n.language?.startsWith("fr")
    ? "fr"
    : "en";
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnersLoaded, setPartnersLoaded] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState("");

  const [countries, setCountries] = useState<Array<{ id: number; label: string }>>([]);
  const [regions, setRegions] = useState<Array<{ id: number; label: string }>>([]);
  const [cities, setCities] = useState<Array<{ id: number; label: string }>>([]);
  const [districts, setDistricts] = useState<Array<{ id: number; label: string }>>([]);

  const [form, setForm] = useState({
    warehouseId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    orderTotal: "",
    weight: "",
    noOfBox: "1",
    productId: "",
    quantity: "1",
    itemDescription: "",
    countryId: "",
    regionId: "",
    cityId: "",
    districtId: "",
    address: "",
    type: "address_city",
    locateAddress: "",
  });
  const [products, setProducts] = useState<any[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const findLabel = (options: Array<{ id: number; label: string }>, value: string) => {
    const match = options.find((option) => String(option.id) === value);
    return match?.label;
  };

  const canSubmit = useMemo(() => {
    if (!selectedPartner) return false;
    if (!form.warehouseId) return false;
    if (!form.customerName || !form.customerPhone || !form.address) return false;
    if (!form.productId) return false;
    if (!form.countryId || !form.regionId || !form.cityId) return false;
    if (!form.orderTotal || !form.weight || !form.noOfBox) return false;
    if (!form.itemDescription) return false;
    if (form.type === "normal" && !form.districtId && !form.locateAddress) return false;
    return true;
  }, [form, selectedPartner]);

  const canFetchPartners = useMemo(() => {
    return form.warehouseId && form.cityId && form.orderTotal && form.weight && form.noOfBox;
  }, [form]);

  const loadWarehouses = async () => {
    try {
      const res = await api.get("/seller/warehouses");
      setWarehouses(res.data?.warehouses ?? []);
    } catch (_err) {
      setWarehouses([]);
    }
  };

  const loadProducts = async (warehouseId: string) => {
    if (!warehouseId) {
      setProducts([]);
      return;
    }
    try {
      const res = await api.get("/seller/products", {
        params: { warehouse_id: warehouseId },
      });
      setProducts(res.data ?? []);
    } catch (_err) {
      setProducts([]);
    }
  };

  const loadCountries = async () => {
    try {
      const res = await api.get("/torod/countries", { params: { page: 1 } });
      const list = extractList(res.data)
        .map((item) => resolveOption(item, lang))
        .filter(Boolean) as Array<{ id: number; label: string }>;
      setCountries(list);
      if (!form.countryId && list.length > 0) {
        setForm((prev) => ({ ...prev, countryId: String(list[0].id) }));
      }
    } catch (_err) {
      setCountries([]);
    }
  };

  const loadRegions = async (countryId: string) => {
    if (!countryId) {
      setRegions([]);
      return;
    }
    try {
      const res = await api.get("/torod/regions", {
        params: { country_id: countryId, page: 1 },
      });
      const list = extractList(res.data)
        .map((item) => resolveOption(item, lang))
        .filter(Boolean) as Array<{ id: number; label: string }>;
      setRegions(list);
      if (list.length > 0) {
        setForm((prev) => ({ ...prev, regionId: String(list[0].id) }));
      }
    } catch (_err) {
      setRegions([]);
    }
  };

  const loadCities = async (regionId: string) => {
    if (!regionId) {
      setCities([]);
      return;
    }
    try {
      const res = await api.get("/torod/cities", {
        params: { region_id: regionId, page: 1 },
      });
      const list = extractList(res.data)
        .map((item) => resolveOption(item, lang))
        .filter(Boolean) as Array<{ id: number; label: string }>;
      setCities(list);
      if (list.length > 0) {
        setForm((prev) => ({ ...prev, cityId: String(list[0].id) }));
      }
    } catch (_err) {
      setCities([]);
    }
  };

  const loadDistricts = async (cityId: string) => {
    if (!cityId) {
      setDistricts([]);
      return;
    }
    try {
      const res = await api.get("/torod/districts", {
        params: { cities_id: cityId, page: 1 },
      });
      const list = extractList(res.data)
        .map((item) => resolveOption(item, lang))
        .filter(Boolean) as Array<{ id: number; label: string }>;
      setDistricts(list);
      if (list.length > 0) {
        setForm((prev) => ({ ...prev, districtId: String(list[0].id) }));
      }
    } catch (_err) {
      setDistricts([]);
    }
  };

  useEffect(() => {
    loadWarehouses();
    loadCountries();
  }, []);

  useEffect(() => {
    if (form.warehouseId) {
      loadProducts(form.warehouseId);
    } else {
      setProducts([]);
    }
    setSelectedProduct(null);
    setPartners([]);
    setPartnersLoaded(false);
    setSelectedPartner("");
    setForm((prev) => ({
      ...prev,
      productId: "",
      orderTotal: "",
      weight: "",
      noOfBox: "1",
      itemDescription: "",
    }));
  }, [form.warehouseId]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, regionId: "", cityId: "", districtId: "" }));
    setPartners([]);
    setPartnersLoaded(false);
    setSelectedPartner("");
    loadRegions(form.countryId);
  }, [form.countryId]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, cityId: "", districtId: "" }));
    setPartners([]);
    setPartnersLoaded(false);
    setSelectedPartner("");
    loadCities(form.regionId);
  }, [form.regionId]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, districtId: "" }));
    setPartners([]);
    setPartnersLoaded(false);
    setSelectedPartner("");
    loadDistricts(form.cityId);
  }, [form.cityId]);

  useEffect(() => {
    if (!canFetchPartners) return;
    if (partnersLoaded) return;
    handleFetchPartners();
  }, [
    canFetchPartners,
    form.warehouseId,
    form.cityId,
    form.orderTotal,
    form.weight,
    form.noOfBox,
    partnersLoaded,
  ]);

  const handleFetchPartners = async () => {
    if (!canFetchPartners || partnersLoading) return;
    try {
      setPartnersLoading(true);
      setError(null);
      const response = await api.post("/seller/manual-shipments/partners", {
        warehouse_id: Number(form.warehouseId),
        customer_city_id: Number(form.cityId),
        payment: "Prepaid",
        weight: Number(form.weight),
        order_total: Number(form.orderTotal),
        no_of_box: Number(form.noOfBox),
        type: "normal",
        filter_by: "cheapest",
      });
      const list = response.data?.partners ?? [];
      setPartners(list);
      setPartnersLoaded(true);
      if (list.length && !selectedPartner) {
        setSelectedPartner(String(list[0].id));
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || t("common.error")
      );
      setPartnersLoaded(true);
    } finally {
      setPartnersLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitLoading(true);
      setError(null);
      setSuccess(null);
      setCreatedOrderId(null);
      const payload = {
        warehouse_id: Number(form.warehouseId),
        product_id: Number(form.productId),
        quantity: Number(form.quantity),
        customer_name: form.customerName,
        customer_phone: form.customerPhone,
        customer_email: form.customerEmail || undefined,
        customer_country: findLabel(countries, form.countryId),
        customer_region: findLabel(regions, form.regionId),
        customer_city: findLabel(cities, form.cityId),
        country_id: Number(form.countryId),
        region_id: Number(form.regionId),
        city_id: Number(form.cityId),
        district_id: form.districtId ? Number(form.districtId) : undefined,
        address: form.address,
        weight: Number(form.weight),
        no_of_box: Number(form.noOfBox),
        order_total: Number(form.orderTotal),
        item_description: form.itemDescription,
        courier_partner_id: Number(selectedPartner),
        type: form.type,
        locate_address: form.locateAddress || undefined,
      };
      const response = await api.post("/seller/manual-shipments", payload);
      const createdOrder = response?.data?.order ?? response?.data;
      if (createdOrder?.id) {
        setCreatedOrderId(Number(createdOrder.id));
      }
      setSuccess(t("seller.manualShipmentCreated", "تم إنشاء الطلب الخارجي بنجاح"));
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || t("common.error")
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-lg font-semibold text-charcoal">
          {t("seller.manualShipmentTitle", "إنشاء طلب خارجي")}
        </h2>
        <p className="text-sm text-taupe mt-1">
          {t(
            "seller.manualShipmentSubtitle",
            "استخدم هذه الصفحة لإنشاء طلب خارجي مدفوع مسبقًا، ثم أصدر البوليصة من صفحة الطلبات."
          )}
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.warehouseSelect", "المستودع")}
            </label>
            <select
              value={form.warehouseId}
              onChange={(e) => setForm((prev) => ({ ...prev, warehouseId: e.target.value }))}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">{t("seller.selectWarehouse", "اختر مستودع")}</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.warehouseName} ({warehouse.warehouseCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.customerName", "اسم العميل")}
            </label>
            <input
              value={form.customerName}
              onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
              placeholder={t("seller.customerNamePlaceholder", "مثال: أحمد")}
            />
          </div>

          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.customerPhone", "رقم الهاتف")}
            </label>
            <input
              value={form.customerPhone}
              onChange={(e) => setForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
              placeholder="9665xxxxxxxx"
            />
          </div>

          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.customerEmail", "البريد الإلكتروني")}
            </label>
            <input
              value={form.customerEmail}
              onChange={(e) => setForm((prev) => ({ ...prev, customerEmail: e.target.value }))}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.selectProduct", "اختر المنتج")}
            </label>
            <button
              type="button"
              onClick={() => setProductPickerOpen(true)}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm text-charcoal hover:border-gold/60 transition text-left"
              disabled={!form.warehouseId}
            >
              {selectedProduct
                ? `${getLocalizedName(selectedProduct, lang)} (${selectedProduct.id})`
                : t("seller.pickProduct", "اختيار منتج من المستودع")}
            </button>
          </div>

          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.quantity", "الكمية")}
            </label>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => {
                const quantity = e.target.value;
                setForm((prev) => ({ ...prev, quantity, noOfBox: quantity }));
                if (selectedProduct) {
                  const price = Number(selectedProduct.base_price ?? 0);
                  const weight = Number(
                    selectedProduct.weight_kg ??
                      (selectedProduct.size_ml ? selectedProduct.size_ml / 1000 : 0)
                  );
                  const totalQty = Number(quantity || 1);
                  const totalAmount = price * totalQty;
                  const totalWeight = (weight || 1) * totalQty;
                  setForm((prev) => ({
                    ...prev,
                    orderTotal: totalAmount ? String(totalAmount) : prev.orderTotal,
                    weight: totalWeight ? String(totalWeight) : prev.weight,
                  }));
                }
              }}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.itemDescription", "وصف الطلب")}
            </label>
            <input
              value={form.itemDescription}
              onChange={(e) => setForm((prev) => ({ ...prev, itemDescription: e.target.value }))}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
              placeholder={t("seller.itemDescriptionPlaceholder", "مثال: عطر رجالي")}
            />
          </div>

          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.orderTotal", "إجمالي الطلب")}
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={form.orderTotal}
              onChange={(e) => setForm((prev) => ({ ...prev, orderTotal: e.target.value }))}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm bg-sand/40"
              readOnly
            />
          </div>

          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.shipmentWeight", "الوزن (كجم)")}
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={form.weight}
              onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm bg-sand/40"
              readOnly
            />
          </div>

          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.shipmentBoxes", "عدد الصناديق")}
            </label>
            <input
              type="number"
              min="1"
              value={form.noOfBox}
              onChange={(e) => setForm((prev) => ({ ...prev, noOfBox: e.target.value }))}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.country", "الدولة")}
            </label>
            <select
              value={form.countryId}
              onChange={(e) => setForm((prev) => ({ ...prev, countryId: e.target.value }))}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">{t("seller.selectCountry", "اختر الدولة")}</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.region", "المنطقة")}
            </label>
            <select
              value={form.regionId}
              onChange={(e) => setForm((prev) => ({ ...prev, regionId: e.target.value }))}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">{t("seller.selectRegion", "اختر المنطقة")}</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.city", "المدينة")}
            </label>
            <select
              value={form.cityId}
              onChange={(e) => setForm((prev) => ({ ...prev, cityId: e.target.value }))}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">{t("seller.selectCity", "اختر المدينة")}</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.district", "الحي")}
            </label>
            <select
              value={form.districtId}
              onChange={(e) => setForm((prev) => ({ ...prev, districtId: e.target.value }))}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">{t("seller.selectDistrict", "اختر الحي")}</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.address", "العنوان")}
            </label>
            <input
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
              placeholder={t("seller.addressPlaceholder", "مثال: شارع الملك فهد")}
            />
          </div>

          <div>
            <label className="block text-xs text-taupe mb-1">
              {t("seller.locateAddress", "العنوان التفصيلي (اختياري)")}
            </label>
            <input
              value={form.locateAddress}
              onChange={(e) => setForm((prev) => ({ ...prev, locateAddress: e.target.value }))}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          {partnersLoading && (
            <p className="text-sm text-taupe">
              {t("orders.loadingPartners", "جاري جلب الشركات...")}
            </p>
          )}
          {!partnersLoading && canFetchPartners && partnersLoaded && partners.length === 0 && (
            <p className="text-sm text-taupe">
              {t("orders.noPartners", "لا توجد شركات شحن متاحة لهذه البيانات.")}
            </p>
          )}
        </div>

        {partners.length > 0 && (
          <div className="mt-4">
            <label className="block text-xs text-taupe mb-1">
              {t("checkout.courierPartner", "شركة الشحن")}
            </label>
            <select
              value={selectedPartner}
              onChange={(e) => setSelectedPartner(e.target.value)}
              className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">
                {t("checkout.courierPlaceholder", "اختر شركة الشحن")}
              </option>
              {partners.map((partner) => {
                const name = getLocalizedName(partner, lang);
                const rate =
                  partner.rate !== null && partner.rate !== undefined
                    ? ` - ${partner.rate} ${partner.currency || "SAR"}`
                    : "";
                return (
                  <option key={partner.id} value={partner.id}>
                    {`${name}${rate}`}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitLoading}
            className="bg-gold text-charcoal px-5 py-2 rounded-luxury text-sm font-semibold hover:bg-gold-hover transition disabled:opacity-60"
          >
            {submitLoading
              ? t("seller.externalOrderCreating", "جاري إنشاء الطلب...")
              : t("seller.createExternalOrder", "إنشاء الطلب الخارجي")}
          </button>
          {success && <span className="text-sm text-green-600">{success}</span>}
          {error && <span className="text-sm text-alert">{error}</span>}
        </div>
        {createdOrderId && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  window.location.pathname.startsWith("/admin")
                    ? "/admin/orders"
                    : "/seller/orders"
                )
              }
              className="text-sm text-charcoal underline hover:text-gold"
            >
              {t("orders.viewOrders", "عرض الطلبات")}
            </button>
          </div>
        )}
      </div>

      {productPickerOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand/80">
              <h3 className="text-lg font-semibold text-charcoal">
                {t("seller.selectProduct", "اختر المنتج")}
              </h3>
              <button
                type="button"
                onClick={() => setProductPickerOpen(false)}
                className="text-charcoal hover:text-alert text-sm font-semibold"
              >
                {t("common.close", "إغلاق")}
              </button>
            </div>
            <div className="p-5 space-y-4">
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full border border-sand/70 rounded-lg px-3 py-2 text-sm"
                placeholder={t("seller.searchProducts", "ابحث عن منتج...")}
              />
              <div className="max-h-[360px] overflow-y-auto space-y-2">
                {products
                  .filter((product) => {
                    const name =
                      getLocalizedName(product, lang) ||
                      String(product.id);
                    return name.toLowerCase().includes(productSearch.toLowerCase());
                  })
                  .map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        const price = Number(product.base_price ?? 0);
                        const weight = Number(
                          product.weight_kg ??
                            (product.size_ml ? product.size_ml / 1000 : 0)
                        );
                        const qty = Number(form.quantity || 1);
                        const totalAmount = price * qty;
                        const totalWeight = (weight || 1) * qty;
                        setSelectedProduct(product);
                        setForm((prev) => ({
                          ...prev,
                          productId: String(product.id),
                          itemDescription:
                            getLocalizedName(product, lang) || prev.itemDescription,
                          orderTotal: totalAmount ? String(totalAmount) : prev.orderTotal,
                          weight: totalWeight ? String(totalWeight) : prev.weight,
                          noOfBox: prev.quantity,
                        }));
                        setProductPickerOpen(false);
                      }}
                      className="w-full text-left border border-sand/70 rounded-xl px-4 py-3 hover:border-gold/60 transition"
                    >
                      <p className="text-sm font-semibold text-charcoal">
                        {getLocalizedName(product, lang)}
                      </p>
                      <p className="text-xs text-taupe">
                        #{product.id} · {product.base_price} SAR
                      </p>
                    </button>
                  ))}
                {products.length === 0 && (
                  <p className="text-sm text-taupe">
                    {t("seller.noProducts", "لا توجد منتجات في هذا المستودع")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
