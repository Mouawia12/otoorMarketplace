import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Promotion,
  PromotionType,
  createPromotion,
  deletePromotion,
  fetchPromotions,
  updatePromotion,
} from '../services/promotionService';
import { resolveImageUrl } from '../utils/image';

const typeLabels: Record<PromotionType, { icon: string; className: string }> = {
  HERO: { icon: '🎞️', className: 'bg-purple-100 text-purple-700' },
  STRIP: { icon: '📢', className: 'bg-emerald-100 text-emerald-700' },
  FLOATING: { icon: '💬', className: 'bg-blue-100 text-blue-700' },
};

type FormState = {
  id: number | null;
  type: PromotionType;
  title_en: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ar: string;
  description_en: string;
  description_ar: string;
  badge_text_en: string;
  badge_text_ar: string;
  button_text_en: string;
  button_text_ar: string;
  image_url: string;
  link_url: string;
  background_color: string;
  text_color: string;
  floating_position: 'bottom-right' | 'bottom-left';
  sort_order: number;
  is_active: boolean;
  start_at: string;
  end_at: string;
};

const defaultForm: FormState = {
  id: null,
  type: 'HERO',
  title_en: '',
  title_ar: '',
  subtitle_en: '',
  subtitle_ar: '',
  description_en: '',
  description_ar: '',
  badge_text_en: '',
  badge_text_ar: '',
  button_text_en: '',
  button_text_ar: '',
  image_url: '',
  link_url: '',
  background_color: '#111827',
  text_color: '#ffffff',
  floating_position: 'bottom-right',
  sort_order: 0,
  is_active: true,
  start_at: '',
  end_at: '',
};

const formatDateTimeValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

const parseDateTimeValue = (value: string) => (value ? new Date(value).toISOString() : null);

export default function AdminAdsPage() {
  const { t, i18n } = useTranslation();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const data = await fetchPromotions();
      setPromotions(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const upcoming = promotions.filter(
      (promo) => promo.start_at && new Date(promo.start_at).getTime() > now
    );
    const running = promotions.filter((promo) => {
      if (!promo.is_active) return false;
      const start = promo.start_at ? new Date(promo.start_at).getTime() : null;
      const end = promo.end_at ? new Date(promo.end_at).getTime() : null;
      if (start && start > now) return false;
      if (end && end < now) return false;
      return true;
    });
    return {
      total: promotions.length,
      hero: promotions.filter((p) => p.type === 'HERO').length,
      strip: promotions.filter((p) => p.type === 'STRIP').length,
      floating: promotions.filter((p) => p.type === 'FLOATING').length,
      running: running.length,
      upcoming: upcoming.length,
    };
  }, [promotions]);

  const openModal = (promotion?: Promotion) => {
    if (promotion) {
      setForm({
        id: promotion.id,
        type: promotion.type,
        title_en: promotion.title_en ?? '',
        title_ar: promotion.title_ar ?? '',
        subtitle_en: promotion.subtitle_en ?? '',
        subtitle_ar: promotion.subtitle_ar ?? '',
        description_en: promotion.description_en ?? '',
        description_ar: promotion.description_ar ?? '',
        badge_text_en: promotion.badge_text_en ?? '',
        badge_text_ar: promotion.badge_text_ar ?? '',
        button_text_en: promotion.button_text_en ?? '',
        button_text_ar: promotion.button_text_ar ?? '',
        image_url: promotion.image_url ?? '',
        link_url: promotion.link_url ?? '',
        background_color: promotion.background_color ?? '#111827',
        text_color: promotion.text_color ?? '#ffffff',
        floating_position:
          (promotion.floating_position as 'bottom-left' | 'bottom-right') ?? 'bottom-right',
        sort_order: promotion.sort_order ?? 0,
        is_active: Boolean(promotion.is_active),
        start_at: formatDateTimeValue(promotion.start_at),
        end_at: formatDateTimeValue(promotion.end_at),
      });
    } else {
      setForm(defaultForm);
    }
    setModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      type: form.type,
      title_en: form.title_en,
      title_ar: form.title_ar,
      subtitle_en: form.subtitle_en || null,
      subtitle_ar: form.subtitle_ar || null,
      description_en: form.description_en || null,
      description_ar: form.description_ar || null,
      badge_text_en: form.badge_text_en || null,
      badge_text_ar: form.badge_text_ar || null,
      button_text_en: form.button_text_en || null,
      button_text_ar: form.button_text_ar || null,
      image_url: form.image_url || null,
      link_url: form.link_url || null,
      background_color: form.background_color || null,
      text_color: form.text_color || null,
      floating_position: form.type === 'FLOATING' ? form.floating_position : null,
      is_active: form.is_active,
      sort_order: form.sort_order,
      start_at: form.start_at ? parseDateTimeValue(form.start_at) : null,
      end_at: form.end_at ? parseDateTimeValue(form.end_at) : null,
    };

    try {
      if (form.id) {
        await updatePromotion(form.id, payload);
      } else {
        await createPromotion(payload);
      }
      setModalOpen(false);
      await loadPromotions();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (promotion: Promotion) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    try {
      await deletePromotion(promotion.id);
      await loadPromotions();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('common.error'));
    }
  };

  const handleToggleActive = async (promotion: Promotion) => {
    try {
      await updatePromotion(promotion.id, { is_active: !promotion.is_active });
      await loadPromotions();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('common.error'));
    }
  };

  const renderPreview = (promotion: Promotion) => {
    const lang = i18n.language as 'ar' | 'en';
    const bg = promotion.background_color || '#0f172a';
    const color = promotion.text_color || '#ffffff';
    const title = lang === 'ar' ? promotion.title_ar : promotion.title_en;
    const subtitle = lang === 'ar' ? promotion.subtitle_ar : promotion.subtitle_en;
    const description = lang === 'ar' ? promotion.description_ar : promotion.description_en;
    const badge = lang === 'ar' ? promotion.badge_text_ar : promotion.badge_text_en;
    const buttonLabel = lang === 'ar' ? promotion.button_text_ar : promotion.button_text_en;
    const image = promotion.image_url ? resolveImageUrl(promotion.image_url) : null;

    if (promotion.type === 'STRIP') {
      return (
        <div className="rounded-xl p-4" style={{ backgroundColor: bg, color }}>
          {badge && (
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur">
              {badge}
            </span>
          )}
          <div className="text-lg font-bold mt-2">{title}</div>
          {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
        </div>
      );
    }

    if (promotion.type === 'FLOATING') {
      return (
        <div className="rounded-2xl p-4 flex gap-3 shadow-xl border border-white/20" style={{ backgroundColor: bg, color }}>
          {image && (
            <div className="w-16 h-16 rounded-xl overflow-hidden shadow bg-black/10">
              <img src={image} alt={title ?? ''} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="space-y-1">
            <h4 className="font-semibold">{title}</h4>
            {description && <p className="text-sm opacity-90 line-clamp-2">{description}</p>}
            {buttonLabel && (
              <span className="inline-flex text-xs font-semibold px-3 py-1 rounded-full bg-white/20">
                {buttonLabel}
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl overflow-hidden shadow-lg grid grid-cols-1 md:grid-cols-2" style={{ backgroundColor: bg, color }}>
        <div className="p-6 space-y-3">
          {badge && (
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-white/15">
              {badge}
            </span>
          )}
          <h3 className="text-2xl font-bold">{title}</h3>
          {subtitle && <p className="text-lg opacity-90">{subtitle}</p>}
          {description && <p className="text-sm opacity-80">{description}</p>}
          {buttonLabel && (
            <button className="mt-4 inline-flex px-4 py-2 rounded-full bg-white text-charcoal font-semibold text-sm">
              {buttonLabel}
            </button>
          )}
        </div>
        {image && (
          <div className="relative">
            <img src={image} alt={title ?? ''} className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow">
          <p className="text-sm text-charcoal-light">{t('adminPromotions.total')}</p>
          <p className="text-3xl font-bold text-charcoal">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow">
          <p className="text-sm text-charcoal-light">{t('adminPromotions.running')}</p>
          <p className="text-3xl font-bold text-emerald-600">{stats.running}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow">
          <p className="text-sm text-charcoal-light">{t('adminPromotions.heroCount')}</p>
          <p className="text-3xl font-bold text-purple-600">{stats.hero}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow">
          <p className="text-sm text-charcoal-light">{t('adminPromotions.upcoming')}</p>
          <p className="text-3xl font-bold text-amber-600">{stats.upcoming}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-charcoal">{t('adminPromotions.sectionTitle')}</h2>
            <p className="text-sm text-charcoal-light">{t('adminPromotions.sectionSubtitle')}</p>
          </div>
          <button
            onClick={() => openModal()}
            className="px-5 py-3 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition"
          >
            {t('adminPromotions.newCampaign')}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-taupe">{t('common.loading')}</div>
        ) : promotions.length === 0 ? (
          <div className="py-12 text-center text-charcoal-light">
            {t('adminPromotions.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-sand">
              <thead>
                <tr className="text-sm text-charcoal-light">
                  <th className="py-3 px-2 text-left">{t('admin.title')}</th>
                  <th className="py-3 px-2 text-left">{t('admin.type')}</th>
                  <th className="py-3 px-2 text-left">{t('adminPromotions.schedule')}</th>
                  <th className="py-3 px-2 text-left">{t('admin.status')}</th>
                  <th className="py-3 px-2 text-left">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promotion) => {
                  const lang = i18n.language === 'ar' ? 'ar' : 'en';
                  const title = lang === 'ar' ? promotion.title_ar : promotion.title_en;
                  const schedule =
                    promotion.start_at || promotion.end_at
                      ? `${promotion.start_at ? new Date(promotion.start_at).toLocaleDateString(i18n.language) : '•'} → ${
                          promotion.end_at ? new Date(promotion.end_at).toLocaleDateString(i18n.language) : '•'
                        }`
                      : t('adminPromotions.alwaysOn');
                  const runningBadge = promotion.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600';
                  return (
                    <tr key={promotion.id} className="border-b border-sand/80">
                      <td className="py-4 px-2">
                        <p className="font-semibold text-charcoal">{title}</p>
                        {promotion.link_url && (
                          <a href={promotion.link_url} target="_blank" rel="noreferrer" className="text-xs text-gold hover:underline">
                            {promotion.link_url}
                          </a>
                        )}
                      </td>
                      <td className="py-4 px-2">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${typeLabels[promotion.type].className}`}>
                          <span>{typeLabels[promotion.type].icon}</span>
                          {t(`adminPromotions.type.${promotion.type.toLowerCase()}`)}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-sm text-charcoal-light">{schedule}</td>
                      <td className="py-4 px-2">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${runningBadge}`}>
                          {promotion.is_active ? t('admin.active') : t('admin.inactive')}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex flex-wrap gap-3 text-sm">
                          <button onClick={() => openModal(promotion)} className="text-blue-600 hover:underline">
                            {t('common.edit')}
                          </button>
                          <button onClick={() => handleToggleActive(promotion)} className="text-amber-600 hover:underline">
                            {promotion.is_active ? t('adminPromotions.pause') : t('adminPromotions.resume')}
                          </button>
                          <button onClick={() => handleDelete(promotion)} className="text-red-600 hover:underline">
                            {t('common.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] flex-1 overflow-hidden">
              <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-charcoal">
                      {form.id ? t('adminPromotions.editCampaign') : t('adminPromotions.newCampaign')}
                    </h3>
                    <p className="text-sm text-charcoal-light">{t('adminPromotions.formSubtitle')}</p>
                  </div>
                  <button type="button" onClick={() => setModalOpen(false)} className="text-2xl leading-none text-charcoal-light hover:text-charcoal">
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('admin.titleEn')}</label>
                    <input
                      type="text"
                      value={form.title_en}
                      onChange={(e) => setForm((prev) => ({ ...prev, title_en: e.target.value }))}
                      className="w-full border border-sand rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('admin.titleAr')}</label>
                    <input
                      type="text"
                      value={form.title_ar}
                      onChange={(e) => setForm((prev) => ({ ...prev, title_ar: e.target.value }))}
                      className="w-full border border-sand rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('adminPromotions.subtitleEn')}</label>
                    <input
                      type="text"
                      value={form.subtitle_en}
                      onChange={(e) => setForm((prev) => ({ ...prev, subtitle_en: e.target.value }))}
                      className="w-full border border-sand rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('adminPromotions.subtitleAr')}</label>
                    <input
                      type="text"
                      value={form.subtitle_ar}
                      onChange={(e) => setForm((prev) => ({ ...prev, subtitle_ar: e.target.value }))}
                      className="w-full border border-sand rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('adminPromotions.descriptionEn')}</label>
                    <textarea
                      value={form.description_en}
                      onChange={(e) => setForm((prev) => ({ ...prev, description_en: e.target.value }))}
                      className="w-full border border-sand rounded-lg px-3 py-2"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('adminPromotions.descriptionAr')}</label>
                    <textarea
                      value={form.description_ar}
                      onChange={(e) => setForm((prev) => ({ ...prev, description_ar: e.target.value }))}
                      className="w-full border border-sand rounded-lg px-3 py-2"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('admin.type')}</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as PromotionType }))}
                      className="w-full border border-sand rounded-lg px-3 py-2"
                    >
                      <option value="HERO">{t('adminPromotions.type.hero')}</option>
                      <option value="STRIP">{t('adminPromotions.type.strip')}</option>
                      <option value="FLOATING">{t('adminPromotions.type.floating')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('adminPromotions.sortOrder')}</label>
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
                      className="w-full border border-sand rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="is_active"
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <label htmlFor="is_active" className="text-sm font-semibold text-charcoal">
                      {t('admin.active')}
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('adminPromotions.imageUrl')}</label>
                    <input
                      type="text"
                      value={form.image_url}
                      onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
                      className="w-full border border-sand rounded-lg px-3 py-2"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('adminPromotions.linkUrl')}</label>
                    <input
                      type="text"
                      value={form.link_url}
                      onChange={(e) => setForm((prev) => ({ ...prev, link_url: e.target.value }))}
                      className="w-full border border-sand rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('adminPromotions.background')}</label>
                    <input
                      type="color"
                      value={form.background_color}
                      onChange={(e) => setForm((prev) => ({ ...prev, background_color: e.target.value }))}
                      className="w-full border border-sand rounded-lg h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('adminPromotions.textColor')}</label>
                    <input
                      type="color"
                      value={form.text_color}
                      onChange={(e) => setForm((prev) => ({ ...prev, text_color: e.target.value }))}
                      className="w-full border border-sand rounded-lg h-11"
                    />
                  </div>
                  {form.type === 'FLOATING' && (
                    <div>
                      <label className="block text-sm font-semibold mb-1">{t('adminPromotions.floatingPosition')}</label>
                      <select
                        value={form.floating_position}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            floating_position: e.target.value as 'bottom-left' | 'bottom-right',
                          }))
                        }
                        className="w-full border border-sand rounded-lg px-3 py-2"
                      >
                        <option value="bottom-right">{t('adminPromotions.bottomRight')}</option>
                        <option value="bottom-left">{t('adminPromotions.bottomLeft')}</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('adminPromotions.buttonTextEn')}</label>
                    <input
                      type="text"
                      value={form.button_text_en}
                      onChange={(e) => setForm((prev) => ({ ...prev, button_text_en: e.target.value }))}
                      className="w-full border border-sand rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('adminPromotions.buttonTextAr')}</label>
                    <input
                      type="text"
                      value={form.button_text_ar}
                      onChange={(e) => setForm((prev) => ({ ...prev, button_text_ar: e.target.value }))}
                      className="w-full border border-sand rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('adminPromotions.badgeEn')}</label>
                    <input
                      type="text"
                      value={form.badge_text_en}
                      onChange={(e) => setForm((prev) => ({ ...prev, badge_text_en: e.target.value }))}
                      className="w-full border border-sand rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('adminPromotions.badgeAr')}</label>
                    <input
                      type="text"
                      value={form.badge_text_ar}
                      onChange={(e) => setForm((prev) => ({ ...prev, badge_text_ar: e.target.value }))}
                      className="w-full border border-sand rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('adminPromotions.startAt')}</label>
                    <input
                      type="datetime-local"
                      value={form.start_at}
                      onChange={(e) => setForm((prev) => ({ ...prev, start_at: e.target.value }))}
                      className="w-full border border-sand rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t('adminPromotions.endAt')}</label>
                    <input
                      type="datetime-local"
                      value={form.end_at}
                      onChange={(e) => setForm((prev) => ({ ...prev, end_at: e.target.value }))}
                      className="w-full border border-sand rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gold text-charcoal rounded-luxury py-3 font-semibold hover:bg-gold-hover transition disabled:opacity-60"
                    disabled={submitting}
                  >
                    {submitting ? t('common.loading') : t('common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 border border-sand rounded-luxury py-3 font-semibold text-charcoal hover:bg-sand transition"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>

              <div className="bg-slate-900/5 p-6 lg:p-8 space-y-4 border-t lg:border-t-0 lg:border-r border-sand/60 overflow-y-auto max-h-[90vh]">
                <h4 className="text-lg font-semibold text-charcoal">{t('adminPromotions.preview')}</h4>
                {renderPreview({
                  id: form.id ?? 0,
                  type: form.type,
                  title_en: form.title_en,
                  title_ar: form.title_ar,
                  subtitle_en: form.subtitle_en,
                  subtitle_ar: form.subtitle_ar,
                  description_en: form.description_en,
                  description_ar: form.description_ar,
                  badge_text_en: form.badge_text_en,
                  badge_text_ar: form.badge_text_ar,
                  button_text_en: form.button_text_en,
                  button_text_ar: form.button_text_ar,
                  image_url: form.image_url,
                  link_url: form.link_url,
                  background_color: form.background_color,
                  text_color: form.text_color,
                  floating_position: form.floating_position,
                  is_active: form.is_active,
                  sort_order: form.sort_order,
                  start_at: form.start_at,
                  end_at: form.end_at,
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
