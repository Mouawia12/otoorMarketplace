import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { formatPrice } from '../utils/currency';

type Coupon = {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  expires_at: string | null;
  max_usage: number | null;
  usage_count: number;
  is_active: boolean;
  created_at?: string;
  seller_id?: number | null;
};

type CouponFormState = {
  id: number | null;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  expiresAt: string;
  maxUsage: string;
  isActive: boolean;
};

const defaultForm: CouponFormState = {
  id: null,
  code: '',
  discountType: 'percentage',
  discountValue: '10',
  expiresAt: '',
  maxUsage: '',
  isActive: true,
};

const toInputDate = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export default function AdminCouponsPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language as 'ar' | 'en') || 'en';
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);

  const [form, setForm] = useState<CouponFormState>(defaultForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    return {
      total: coupons.length,
      active: coupons.filter((c) => c.is_active).length,
      usage: coupons.reduce((sum, c) => sum + c.usage_count, 0),
    };
  }, [coupons]);

  const loadCoupons = async () => {
    setLoading(true);
    setTableError(null);
    try {
      const response = await api.get<Coupon[]>('/coupons');
      setCoupons(response.data);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? t('common.error');
      setTableError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const resetForm = () => {
    setForm(defaultForm);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleEdit = (coupon: Coupon) => {
    setForm({
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: String(coupon.discount_value),
      expiresAt: toInputDate(coupon.expires_at),
      maxUsage: coupon.max_usage ? String(coupon.max_usage) : '',
      isActive: coupon.is_active,
    });
    setFormSuccess(null);
    setFormError(null);
  };

  const buildPayload = () => {
    const discountValue = Number(form.discountValue);
    if (!form.code.trim() || Number.isNaN(discountValue) || discountValue <= 0) {
      throw new Error(t('adminCoupons.validationError', 'تحقق من القيم المدخلة'));
    }

    return {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discountType,
      discount_value: discountValue,
      expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      max_usage: form.maxUsage ? Number(form.maxUsage) : null,
      is_active: form.isActive,
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    let payload;
    try {
      payload = buildPayload();
    } catch (error: any) {
      setFormError(error.message);
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await api.patch(`/coupons/${form.id}`, payload);
        setFormSuccess(t('adminCoupons.updated', 'تم تحديث الكوبون'));
      } else {
        await api.post('/coupons', payload);
        setFormSuccess(t('adminCoupons.created', 'تم إنشاء الكوبون'));
      }
      await loadCoupons();
      if (!form.id) {
        resetForm();
      }
    } catch (error: any) {
      const message = error?.response?.data?.message ?? t('common.error');
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      await api.patch(`/coupons/${coupon.id}`, {
        is_active: !coupon.is_active,
      });
      await loadCoupons();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? t('common.error');
      setTableError(message);
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    const confirmed = window.confirm(t('adminCoupons.confirmDelete'));
    if (!confirmed) return;

    try {
      await api.delete(`/coupons/${coupon.id}`);
      await loadCoupons();
      if (form.id === coupon.id) {
        resetForm();
      }
    } catch (error: any) {
      const message = error?.response?.data?.message ?? t('common.error');
      setTableError(message);
    }
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    }
    return formatPrice(coupon.discount_value, lang);
  };

  const formatExpiration = (coupon: Coupon) => {
    if (!coupon.expires_at) {
      return t('adminCoupons.noExpiry');
    }
    const date = new Date(coupon.expires_at);
    return date.toLocaleString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-charcoal mb-1">
            {t('adminCoupons.title')}
          </h1>
          <p className="text-charcoal-light">
            {t('adminCoupons.subtitle')}
          </p>
        </div>
        {form.id && (
          <button
            onClick={resetForm}
            className="px-4 py-2 rounded-luxury border border-charcoal text-charcoal font-semibold hover:bg-charcoal hover:text-ivory transition min-h-[44px]"
          >
            {t('adminCoupons.newCoupon')}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-luxury p-4 shadow-sm">
          <p className="text-sm text-charcoal-light">{t('adminCoupons.statsTotal')}</p>
          <p className="text-3xl font-bold text-charcoal">{stats.total}</p>
        </div>
        <div className="bg-white rounded-luxury p-4 shadow-sm">
          <p className="text-sm text-charcoal-light">{t('adminCoupons.statsActive')}</p>
          <p className="text-3xl font-bold text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-luxury p-4 shadow-sm">
          <p className="text-sm text-charcoal-light">{t('adminCoupons.statsUsage')}</p>
          <p className="text-3xl font-bold text-gold">{stats.usage}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-luxury shadow-sm overflow-hidden">
          <div className="p-6 border-b border-sand">
            <h2 className="text-xl font-semibold text-charcoal">
              {t('adminCoupons.listTitle')}
            </h2>
          </div>
          <div className="p-6">
            {loading ? (
              <p className="text-charcoal-light">{t('common.loading')}</p>
            ) : tableError ? (
              <p className="text-red-500">{tableError}</p>
            ) : coupons.length === 0 ? (
              <p className="text-charcoal-light">{t('adminCoupons.noCoupons')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-sand">
                  <thead className="bg-ivory">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal tracking-wider">
                        {t('adminCoupons.tableCode')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal tracking-wider">
                        {t('adminCoupons.tableType')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal tracking-wider">
                        {t('adminCoupons.tableValue')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal tracking-wider">
                        {t('adminCoupons.tableExpiration')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal tracking-wider">
                        {t('adminCoupons.tableUsage')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal tracking-wider">
                        {t('adminCoupons.tableStatus')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal tracking-wider">
                        {t('adminCoupons.tableActions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id}>
                        <td className="px-4 py-3 font-semibold text-charcoal">{coupon.code}</td>
                        <td className="px-4 py-3 text-sm text-charcoal-light">
                          {coupon.discount_type === 'percentage'
                            ? t('adminCoupons.typePercentage')
                            : t('adminCoupons.typeFixed')}
                        </td>
                        <td className="px-4 py-3 text-sm text-charcoal">
                          {formatDiscount(coupon)}
                        </td>
                        <td className="px-4 py-3 text-sm text-charcoal-light whitespace-nowrap">
                          {formatExpiration(coupon)}
                        </td>
                        <td className="px-4 py-3 text-sm text-charcoal">
                          {coupon.usage_count}
                          {coupon.max_usage ? ` / ${coupon.max_usage}` : ` (${t('adminCoupons.unlimited')})`}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              coupon.is_active
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {coupon.is_active
                              ? t('adminCoupons.active')
                              : t('adminCoupons.inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleEdit(coupon)}
                              className="px-3 py-1 text-sm border border-charcoal rounded-luxury text-charcoal hover:bg-charcoal hover:text-ivory transition"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => handleToggle(coupon)}
                              className="px-3 py-1 text-sm border border-amber-600 rounded-luxury text-amber-700 hover:bg-amber-50 transition"
                            >
                              {coupon.is_active
                                ? t('adminCoupons.deactivate')
                                : t('adminCoupons.activate')}
                            </button>
                            <button
                              onClick={() => handleDelete(coupon)}
                              className="px-3 py-1 text-sm border border-red-500 rounded-luxury text-red-600 hover:bg-red-50 transition"
                            >
                              {t('common.delete')}
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

        <div className="bg-white rounded-luxury shadow-sm p-6">
          <h2 className="text-xl font-semibold text-charcoal mb-1">
            {form.id ? t('adminCoupons.editTitle') : t('adminCoupons.createTitle')}
          </h2>
          <p className="text-sm text-charcoal-light mb-4">
            {t('adminCoupons.formHint')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-2">
                {t('adminCoupons.code')}
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="w-full border border-sand rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
                placeholder="SAVE10"
                maxLength={64}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-2">
                  {t('adminCoupons.discountType')}
                </label>
                <select
                  value={form.discountType}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, discountType: e.target.value as 'percentage' | 'fixed' }))
                  }
                  className="w-full border border-sand rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="percentage">{t('adminCoupons.typePercentage')}</option>
                  <option value="fixed">{t('adminCoupons.typeFixed')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-2">
                  {t('adminCoupons.discountValue')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discountValue}
                  onChange={(e) => setForm((prev) => ({ ...prev, discountValue: e.target.value }))}
                  className="w-full border border-sand rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder={t('adminCoupons.valuePlaceholder')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal mb-2">
                {t('adminCoupons.expiresAt')}
              </label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                className="w-full border border-sand rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal mb-2">
                {t('adminCoupons.maxUsage')}
              </label>
              <input
                type="number"
                min="1"
                value={form.maxUsage}
                onChange={(e) => setForm((prev) => ({ ...prev, maxUsage: e.target.value }))}
                className="w-full border border-sand rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
                placeholder={t('adminCoupons.maxUsagePlaceholder')}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 text-gold border-sand rounded focus:ring-gold"
              />
              <label htmlFor="is_active" className="text-sm text-charcoal">
                {t('adminCoupons.isActive')}
              </label>
            </div>

            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
            {formSuccess && (
              <p className="text-sm text-emerald-600">{formSuccess}</p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-luxury bg-gold text-charcoal font-semibold min-h-[44px] hover:bg-gold-hover transition disabled:opacity-60"
              >
                {saving
                  ? t('common.loading')
                  : form.id
                    ? t('adminCoupons.updateButton')
                    : t('adminCoupons.createButton')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-luxury border border-sand text-charcoal min-h-[44px] hover:bg-sand transition"
              >
                {t('adminCoupons.resetButton')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
