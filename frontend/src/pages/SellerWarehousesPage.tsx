import { useEffect, useMemo, useRef, useState } from "react";
import api from "../lib/api";

const extractList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const resolveOption = (item: any) => {
  const id =
    item?.id ??
    item?.country_id ??
    item?.region_id ??
    item?.city_id ??
    item?.district_id ??
    item?.cities_id;
  const label =
    item?.name ??
    item?.country_name ??
    item?.region_name ??
    item?.city_name ??
    item?.district_name ??
    item?.name_ar ??
    item?.name_en ??
    item?.title ??
    item?.label ??
    item?.value ??
    id;
  if (!id) return null;
  return { id: Number(id), label: String(label) };
};

type WarehouseForm = {
  warehouse_name: string;
  warehouse: string;
  contact_name: string;
  phone_number: string;
  email: string;
  type: "normal" | "address_city" | "latlong";
  country_id: string;
  region_id: string;
  city_id: string;
  district_id: string;
  address: string;
  locate_address: string;
  latitude: string;
  longitude: string;
  zip_code: string;
  short_address: string;
  is_default: boolean;
  is_return_default: boolean;
};

const initialForm: WarehouseForm = {
  warehouse_name: "",
  warehouse: "",
  contact_name: "",
  phone_number: "",
  email: "",
  type: "normal",
  country_id: "",
  region_id: "",
  city_id: "",
  district_id: "",
  address: "",
  locate_address: "",
  latitude: "",
  longitude: "",
  zip_code: "",
  short_address: "",
  is_default: false,
  is_return_default: false,
};

type SellerWarehouse = {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  type: string;
  countryId?: number | null;
  regionId?: number | null;
  cityId?: number | null;
  districtId?: number | null;
  address?: string | null;
  locateAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contactName?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  zipCode?: string | null;
  shortAddress?: string | null;
  isDefault: boolean;
  isReturnDefault: boolean;
};

export default function SellerWarehousesPage() {
  const [form, setForm] = useState<WarehouseForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [warehouses, setWarehouses] = useState<SellerWarehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [countries, setCountries] = useState<Array<{ id: number; label: string }>>([]);
  const [regions, setRegions] = useState<Array<{ id: number; label: string }>>([]);
  const [cities, setCities] = useState<Array<{ id: number; label: string }>>([]);
  const [districts, setDistricts] = useState<Array<{ id: number; label: string }>>([]);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const prevCountryId = useRef<string>("");
  const prevRegionId = useRef<string>("");
  const prevCityId = useRef<string>("");
  const userEditedAddress = useRef(false);

  const canSubmit = useMemo(() => {
    const requiredBase =
      form.warehouse_name &&
      form.warehouse &&
      form.contact_name &&
      form.phone_number &&
      form.email;
    if (!requiredBase) return false;
    if (form.type === "normal") {
      return Boolean(form.district_id && form.locate_address);
    }
    if (form.type === "address_city") {
      return Boolean(form.city_id && form.address);
    }
    if (form.type === "latlong") {
      return Boolean(form.latitude && form.longitude);
    }
    return false;
  }, [form]);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/seller/warehouses");
      setWarehouses(res.data?.warehouses ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "حدث خطأ أثناء جلب العناوين");
    } finally {
      setLoading(false);
    }
  };

  const loadCountries = async () => {
    try {
      setLoadingLookup(true);
      const res = await api.get("/torod/countries", { params: { page: 1 } });
      const list = extractList(res.data)
        .map((item) => resolveOption(item))
        .filter(Boolean) as Array<{ id: number; label: string }>;
      setCountries(list);
    } catch (_err) {
      setCountries([]);
    } finally {
      setLoadingLookup(false);
    }
  };

  const loadRegions = async (countryId: string) => {
    if (!countryId) {
      setRegions([]);
      return;
    }
    try {
      setLoadingLookup(true);
      const res = await api.get("/torod/regions", {
        params: { country_id: countryId, page: 1 },
      });
      const list = extractList(res.data)
        .map((item) => resolveOption(item))
        .filter(Boolean) as Array<{ id: number; label: string }>;
      setRegions(list);
    } catch (_err) {
      setRegions([]);
    } finally {
      setLoadingLookup(false);
    }
  };

  const loadCities = async (regionId: string) => {
    if (!regionId) {
      setCities([]);
      return;
    }
    try {
      setLoadingLookup(true);
      const res = await api.get("/torod/cities", {
        params: { region_id: regionId, page: 1 },
      });
      const list = extractList(res.data)
        .map((item) => resolveOption(item))
        .filter(Boolean) as Array<{ id: number; label: string }>;
      setCities(list);
    } catch (_err) {
      setCities([]);
    } finally {
      setLoadingLookup(false);
    }
  };

  const loadDistricts = async (cityId: string) => {
    if (!cityId) {
      setDistricts([]);
      return;
    }
    try {
      setLoadingLookup(true);
      const res = await api.get("/torod/districts", {
        params: { cities_id: cityId, page: 1 },
      });
      const list = extractList(res.data)
        .map((item) => resolveOption(item))
        .filter(Boolean) as Array<{ id: number; label: string }>;
      setDistricts(list);
    } catch (_err) {
      setDistricts([]);
    } finally {
      setLoadingLookup(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
    loadCountries();
  }, []);

  useEffect(() => {
    loadRegions(form.country_id);
    if (prevCountryId.current && prevCountryId.current !== form.country_id) {
      setForm((prev) => ({ ...prev, region_id: "", city_id: "", district_id: "" }));
      setCities([]);
      setDistricts([]);
    }
    prevCountryId.current = form.country_id;
  }, [form.country_id]);

  useEffect(() => {
    loadCities(form.region_id);
    if (prevRegionId.current && prevRegionId.current !== form.region_id) {
      setForm((prev) => ({ ...prev, city_id: "", district_id: "" }));
      setDistricts([]);
    }
    prevRegionId.current = form.region_id;
  }, [form.region_id]);

  useEffect(() => {
    loadDistricts(form.city_id);
    if (prevCityId.current && prevCityId.current !== form.city_id) {
      setForm((prev) => ({ ...prev, district_id: "" }));
    }
    prevCityId.current = form.city_id;
  }, [form.city_id]);

  useEffect(() => {
    if (!form.district_id) return;
    const match = districts.find((item) => String(item.id) === form.district_id);
    if (!match) return;
    const rawLabel = match.label.trim();
    const prefix = rawLabel.includes("حي") ? rawLabel : `حي ${rawLabel}`;
    if (!userEditedAddress.current) {
      setForm((prev) => ({
        ...prev,
        locate_address: `${prefix}، `,
      }));
    }
  }, [form.district_id, districts]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: target.checked }));
      return;
    }
    if (name === "locate_address") {
      userEditedAddress.current = true;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    userEditedAddress.current = false;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!/^[A-Za-z0-9_-]+$/.test(form.warehouse.trim())) {
      setError("رمز المستودع يجب أن يكون أحرف/أرقام بدون مسافات");
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9_-]+$/.test(form.warehouse.trim())) {
      setError("رمز المستودع يجب أن يحتوي على أحرف وأرقام");
      return;
    }

    const payload = {
      warehouse_name: form.warehouse_name.trim(),
      warehouse: form.warehouse.trim(),
      contact_name: form.contact_name.trim(),
      phone_number: form.phone_number.trim(),
      email: form.email.trim(),
      type: form.type,
      country_id: form.country_id ? Number(form.country_id) : undefined,
      region_id: form.region_id ? Number(form.region_id) : undefined,
      city_id: form.city_id ? Number(form.city_id) : undefined,
      district_id: form.district_id ? Number(form.district_id) : undefined,
      address: form.address.trim() || undefined,
      locate_address: form.locate_address.trim() || undefined,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      zip_code: form.zip_code.trim() || undefined,
      short_address: form.short_address.trim() || undefined,
      is_default: form.is_default,
      is_return_default: form.is_return_default,
    };

    try {
      setLoading(true);
      if (editingId) {
        await api.patch(`/seller/warehouses/${editingId}`, payload);
        setMessage("تم تحديث العنوان بنجاح");
      } else {
        await api.post("/seller/warehouses", payload);
        setMessage("تم إنشاء العنوان بنجاح");
      }
      resetForm();
      await loadWarehouses();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "تعذر حفظ العنوان");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (warehouse: SellerWarehouse) => {
    userEditedAddress.current = Boolean(warehouse.locateAddress);
    setEditingId(warehouse.id);
    setForm({
      ...initialForm,
      warehouse_name: warehouse.warehouseName || "",
      warehouse: warehouse.warehouseCode || "",
      contact_name: warehouse.contactName || "",
      phone_number: warehouse.phoneNumber || "",
      email: warehouse.email || "",
      type: (warehouse.type as WarehouseForm["type"]) || "normal",
      country_id: warehouse.countryId ? String(warehouse.countryId) : "",
      region_id: warehouse.regionId ? String(warehouse.regionId) : "",
      city_id: warehouse.cityId ? String(warehouse.cityId) : "",
      district_id: warehouse.districtId ? String(warehouse.districtId) : "",
      address: warehouse.address || "",
      locate_address: warehouse.locateAddress || "",
      latitude: warehouse.latitude !== null && warehouse.latitude !== undefined ? String(warehouse.latitude) : "",
      longitude: warehouse.longitude !== null && warehouse.longitude !== undefined ? String(warehouse.longitude) : "",
      zip_code: warehouse.zipCode || "",
      short_address: warehouse.shortAddress || "",
      is_default: warehouse.isDefault,
      is_return_default: warehouse.isReturnDefault,
    });
  };

  const setDefaultWarehouse = async (warehouseId: number, type: "default" | "return") => {
    try {
      setLoading(true);
      const payload =
        type === "default"
          ? { is_default: true }
          : { is_return_default: true };
      await api.patch(`/seller/warehouses/${warehouseId}`, payload);
      await loadWarehouses();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "تعذر تحديث الحالة");
    } finally {
      setLoading(false);
    }
  };

  const deleteWarehouse = async (warehouseId: number) => {
    try {
      setLoading(true);
      await api.delete(`/seller/warehouses/${warehouseId}`);
      await loadWarehouses();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "تعذر حذف العنوان");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury shadow-luxury p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-charcoal mb-2">العناوين</h1>
        <p className="text-taupe mb-6">
          أضف عنوان الاستلام المرتبط بطرود ليتم استخدامه أثناء إنشاء الشحنات.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">اسم المستودع</label>
              <input
                name="warehouse_name"
                value={form.warehouse_name}
                onChange={handleChange}
                className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">رمز المستودع</label>
              <input
                name="warehouse"
                value={form.warehouse}
                onChange={handleChange}
                disabled={Boolean(editingId)}
                className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none disabled:bg-sand/40"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">اسم مسؤول الاتصال</label>
              <input
                name="contact_name"
                value={form.contact_name}
                onChange={handleChange}
                className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">رقم الجوال</label>
              <input
                name="phone_number"
                value={form.phone_number}
                onChange={handleChange}
                className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">البريد الإلكتروني</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">نوع العنوان</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              >
                <option value="normal">normal</option>
                <option value="address_city">address_city</option>
                <option value="latlong">latlong</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">الدولة</label>
              <select
                name="country_id"
                value={form.country_id}
                onChange={handleChange}
                className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              >
                <option value="">اختر الدولة</option>
                {countries.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">المنطقة</label>
              <select
                name="region_id"
                value={form.region_id}
                onChange={handleChange}
                className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
                disabled={!form.country_id}
              >
                <option value="">اختر المنطقة</option>
                {regions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">المدينة</label>
              <select
                name="city_id"
                value={form.city_id}
                onChange={handleChange}
                className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
                disabled={!form.region_id}
              >
                <option value="">اختر المدينة</option>
                {cities.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">الحي</label>
              <select
                name="district_id"
                value={form.district_id}
                onChange={handleChange}
                className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
                disabled={!form.city_id}
              >
                <option value="">اختر الحي</option>
                {districts.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.type === "normal" && (
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">العنوان التفصيلي</label>
              <textarea
                name="locate_address"
                value={form.locate_address}
                onChange={handleChange}
                className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
                rows={2}
                required
              />
            </div>
          )}

          {form.type === "address_city" && (
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">العنوان</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
                rows={2}
                required
              />
            </div>
          )}

          {form.type === "latlong" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Latitude</label>
                <input
                  name="latitude"
                  value={form.latitude}
                  onChange={handleChange}
                  className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Longitude</label>
                <input
                  name="longitude"
                  value={form.longitude}
                  onChange={handleChange}
                  className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
                  required
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">الرمز البريدي (اختياري)</label>
              <input
                name="zip_code"
                value={form.zip_code}
                onChange={handleChange}
                className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">عنوان مختصر (اختياري)</label>
              <input
                name="short_address"
                value={form.short_address}
                onChange={handleChange}
                className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-charcoal">
              <input
                type="checkbox"
                name="is_default"
                checked={form.is_default}
                onChange={handleChange}
              />
              تعيين كعنوان افتراضي
            </label>
            <label className="flex items-center gap-2 text-sm text-charcoal">
              <input
                type="checkbox"
                name="is_return_default"
                checked={form.is_return_default}
                onChange={handleChange}
              />
              عنوان افتراضي للمرتجعات
            </label>
          </div>

          {message && <p className="text-sm font-semibold text-emerald-600">{message}</p>}
          {error && <p className="text-sm font-semibold text-alert">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit || loading || loadingLookup}
              className="bg-gold text-charcoal font-semibold px-6 py-3 rounded-luxury hover:bg-gold/90 transition disabled:opacity-60"
            >
              {editingId ? "تحديث العنوان" : "إضافة عنوان"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 rounded-luxury border border-sand/60 text-charcoal"
              >
                إلغاء التعديل
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-luxury shadow-luxury p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-charcoal">قائمة العناوين</h2>
          <button
            onClick={loadWarehouses}
            className="text-sm font-semibold text-charcoal border border-sand/70 px-4 py-2 rounded-luxury hover:bg-sand/60"
          >
            تحديث القائمة
          </button>
        </div>

        {loading && <p className="text-sm text-taupe">جارٍ التحميل...</p>}
        {!loading && warehouses.length === 0 && (
          <p className="text-sm text-taupe">لا توجد عناوين بعد.</p>
        )}

        {warehouses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-charcoal">
                  <th className="text-right py-2">الاسم</th>
                  <th className="text-right py-2">الرمز</th>
                  <th className="text-right py-2">النوع</th>
                  <th className="text-right py-2">المدينة</th>
                  <th className="text-right py-2">الحالة</th>
                  <th className="text-right py-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="border-t border-sand/50">
                    <td className="py-2">{warehouse.warehouseName}</td>
                    <td className="py-2">{warehouse.warehouseCode}</td>
                    <td className="py-2">{warehouse.type}</td>
                    <td className="py-2">{warehouse.cityId ?? "-"}</td>
                    <td className="py-2">
                      {warehouse.isDefault && <span className="text-emerald-600">افتراضي</span>}
                      {!warehouse.isDefault && "-"}
                      {warehouse.isReturnDefault && (
                        <span className="text-amber-600 ml-2">مرتجعات</span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {!warehouse.isDefault && (
                          <button
                            className="text-xs font-semibold text-charcoal border border-sand/70 px-3 py-1 rounded-luxury"
                            onClick={() => setDefaultWarehouse(warehouse.id, "default")}
                          >
                            تعيين افتراضي
                          </button>
                        )}
                        {!warehouse.isReturnDefault && (
                          <button
                            className="text-xs font-semibold text-charcoal border border-sand/70 px-3 py-1 rounded-luxury"
                            onClick={() => setDefaultWarehouse(warehouse.id, "return")}
                          >
                            عنوان مرتجعات
                          </button>
                        )}
                        <button
                          className="text-xs font-semibold text-charcoal border border-sand/70 px-3 py-1 rounded-luxury"
                          onClick={() => startEdit(warehouse)}
                        >
                          تعديل
                        </button>
                        <button
                          className="text-xs font-semibold text-red-600 border border-red-200 px-3 py-1 rounded-luxury"
                          onClick={() => deleteWarehouse(warehouse.id)}
                        >
                          حذف
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
    </div>
  );
}
