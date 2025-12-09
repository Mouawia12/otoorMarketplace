import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ProductTemplate } from '../types';
import {
  adminCreateTemplate,
  adminDeleteTemplate,
  adminListTemplates,
  adminUpdateTemplate,
} from '../services/productTemplateService';
import { normalizeImagePathForStorage, resolveImageUrl } from '../utils/image';
import { compressImageFile } from '../utils/imageCompression';
import { PLACEHOLDER_PERFUME } from '../utils/staticAssets';
import api from '../lib/api';

type ModalMode = 'create' | 'edit';

type TemplateFormState = {
  name_en: string;
  name_ar: string;
  brand: string;
  product_type: string;
  category: string;
  base_price: string;
  size_ml: string;
  concentration: string;
  description_en: string;
  description_ar: string;
  image_urls: string[];
};

const createInitialFormState = (): TemplateFormState => ({
  name_en: '',
  name_ar: '',
  brand: '',
  product_type: 'EDP',
  category: '',
  base_price: '',
  size_ml: '',
  concentration: '',
  description_en: '',
  description_ar: '',
  image_urls: [],
});

const convertArabicDigits = (value: string) => {
  const arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return value.replace(/[٠-٩]/g, (digit) => {
    const index = arabic.indexOf(digit);
    return index >= 0 ? String(index) : digit;
  });
};

const normalizeNumericInput = (value: string) =>
  convertArabicDigits(value)
    .replace(/[٬,]/g, '')
    .replace(/٫/g, '.')
    .trim();

const parseDecimalInput = (value: string) => {
  const normalized = normalizeNumericInput(value);
  return normalized ? parseFloat(normalized) : NaN;
};

const parseIntegerInput = (value: string) => {
  const normalized = normalizeNumericInput(value);
  return normalized ? parseInt(normalized, 10) : NaN;
};

export default function AdminProductLibraryPage() {
  const { t, i18n } = useTranslation();
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingTemplate, setEditingTemplate] = useState<ProductTemplate | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const results = await adminListTemplates({
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        });
        setTemplates(results);
      } catch (error) {
        console.error('Failed to load templates', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [debouncedSearch]);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingTemplate(null);
    setModalOpen(true);
  };

  const openEditModal = (template: ProductTemplate) => {
    setModalMode('edit');
    setEditingTemplate(template);
    setModalOpen(true);
  };

  const visibleTemplates = useMemo(() => templates, [templates]);

  const handleDelete = async (id: number) => {
    if (confirmingId !== id) {
      setConfirmingId(id);
      setTimeout(() => setConfirmingId(null), 3500);
      return;
    }
    try {
      const confirmed = window.confirm(t('admin.confirmDeleteTemplate', 'تأكيد حذف القالب؟'));
      if (!confirmed) {
        setConfirmingId(null);
        return;
      }
      await adminDeleteTemplate(id);
      setTemplates((prev) => prev.filter((tpl) => tpl.id !== id));
    } catch (error) {
      console.error('Failed to delete template', error);
      alert(t('common.error'));
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-h2 text-charcoal">{t('admin.productLibrary', 'مكتبة المنتجات')}</h1>
          <p className="text-taupe">{t('admin.productLibrarySubtitle', 'أضف قوالب احترافية ليستخدمها التجار عند إدراج منتجاتهم.')}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-gold text-charcoal px-4 py-2 rounded-luxury font-semibold hover:bg-gold-hover transition"
        >
          + {t('admin.addTemplate', 'إضافة قالب')}
        </button>
      </header>

      <div className="bg-white rounded-luxury shadow-luxury p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.templateSearchPlaceholder', 'ابحث عن اسم، علامة تجارية أو فئة')}
            className="flex-1 px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
          />
        </div>

        {loading ? (
          <p className="text-center text-taupe py-6">{t('common.loading')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTemplates.map((template) => {
              const name = i18n.language === 'ar' ? template.name_ar : template.name_en;
              const image = resolveImageUrl(template.image_urls?.[0]) || PLACEHOLDER_PERFUME;
              return (
                <div key={template.id} className="border border-gray-200 rounded-luxury overflow-hidden bg-white flex flex-col">
                  <img src={image} alt={name} className="w-full h-40 object-cover" />
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-lg font-semibold text-charcoal">{name}</h3>
                    <p className="text-sm text-taupe mb-2">{template.brand}</p>
                    <div className="text-sm text-charcoal-light flex flex-col gap-1">
                      <span>{t('products.category', 'الفئة')}: {template.category}</span>
                      <span>{t('products.type', 'النوع')}: {template.product_type}</span>
                      <span>{t('products.size', 'الحجم')}: {template.size_ml} ml</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openEditModal(template)}
                        className="flex-1 px-3 py-2 rounded-luxury border border-gold text-charcoal hover:bg-gold/10"
                      >
                        {t('common.edit', 'تعديل')}
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="flex-1 px-3 py-2 rounded-luxury border border-red-300 text-red-600 hover:bg-red-50"
                      >
                        {confirmingId === template.id
                          ? t('common.confirm', 'تأكيد')
                          : t('common.delete', 'حذف')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && visibleTemplates.length === 0 && (
          <p className="text-center text-taupe py-6">{t('admin.noTemplates', 'لم تتم إضافة أي قوالب بعد.')}</p>
        )}
      </div>

      <TemplateModal
        isOpen={modalOpen}
        mode={modalMode}
        template={editingTemplate}
        onClose={() => setModalOpen(false)}
        onSuccess={(template) => {
          setModalOpen(false);
          if (modalMode === 'edit') {
            setTemplates((prev) => prev.map((tpl) => (tpl.id === template.id ? template : tpl)));
          } else {
            setTemplates((prev) => [template, ...prev]);
          }
        }}
      />
    </div>
  );
}

type TemplateModalProps = {
  isOpen: boolean;
  mode: ModalMode;
  template: ProductTemplate | null;
  onClose: () => void;
  onSuccess: (template: ProductTemplate) => void;
};

function TemplateModal({ isOpen, mode, template, onClose, onSuccess }: TemplateModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<TemplateFormState>(() => createInitialFormState());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && template) {
      setFormData({
        name_en: template.name_en,
        name_ar: template.name_ar,
        brand: template.brand,
        product_type: template.product_type,
        category: template.category,
        base_price: template.base_price.toString(),
        size_ml: template.size_ml.toString(),
        concentration: template.concentration,
        description_en: template.description_en,
        description_ar: template.description_ar,
        image_urls: template.image_urls?.slice?.() || [],
      });
    } else {
      setFormData(createInitialFormState());
    }
    setErrors({});
  }, [isOpen, mode, template]);

  if (!isOpen) return null;

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    const parsedPrice = parseDecimalInput(formData.base_price);
    const parsedSize = parseIntegerInput(formData.size_ml);
    if (!formData.name_en.trim()) nextErrors.name_en = t('validation.required', 'هذا الحقل مطلوب');
    if (!formData.name_ar.trim()) nextErrors.name_ar = t('validation.required', 'هذا الحقل مطلوب');
    if (!formData.brand.trim()) nextErrors.brand = t('validation.required', 'هذا الحقل مطلوب');
    if (!formData.category.trim()) nextErrors.category = t('validation.required', 'هذا الحقل مطلوب');
    if (!formData.base_price.trim() || isNaN(parsedPrice) || parsedPrice <= 0)
      nextErrors.base_price = t('validation.priceInvalid', 'أدخل سعراً صحيحاً');
    if (!formData.size_ml.trim() || isNaN(parsedSize) || parsedSize <= 0)
      nextErrors.size_ml = t('validation.sizeInvalid', 'أدخل حجماً صحيحاً');
    if (!formData.concentration.trim()) nextErrors.concentration = t('validation.required', 'هذا الحقل مطلوب');
    if (!formData.description_en.trim()) nextErrors.description_en = t('validation.required', 'هذا الحقل مطلوب');
    if (!formData.description_ar.trim()) nextErrors.description_ar = t('validation.required', 'هذا الحقل مطلوب');
    if (!formData.image_urls.length) nextErrors.image_urls = t('seller.imageRequired', 'Please upload at least one image');
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    try {
      setLoading(true);
      setSubmitError(null);
      const normalizedPrice = parseDecimalInput(formData.base_price);
      const normalizedSize = parseIntegerInput(formData.size_ml);
      const payload = {
        nameEn: formData.name_en,
        nameAr: formData.name_ar,
        brand: formData.brand,
        productType: formData.product_type,
        category: formData.category,
        basePrice: normalizedPrice,
        sizeMl: normalizedSize,
        concentration: formData.concentration,
        descriptionEn: formData.description_en,
        descriptionAr: formData.description_ar,
        imageUrls: formData.image_urls,
      };

      let result: ProductTemplate;
      if (mode === 'edit' && template) {
        result = await adminUpdateTemplate(template.id, payload);
      } else {
        result = await adminCreateTemplate(payload);
      }

      onSuccess(result);
    } catch (error: any) {
      console.error('Failed to save template', error);
      const message = error.response?.data?.detail || error.response?.data?.message || t('admin.templateSaveFailed', 'تعذر حفظ القالب');
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange =
    (field: keyof Omit<TemplateFormState, 'image_urls'>) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    if (!files.length) return;
    try {
      setUploading(true);
      const uploaded: string[] = [];
      const MAX_BYTES = 3 * 1024 * 1024;
      for (const file of files) {
        const optimized = await compressImageFile(file, { maxBytes: MAX_BYTES });
        if (optimized.size > MAX_BYTES) {
          alert(t('seller.imageTooLarge', 'حجم الصورة يجب ألا يتجاوز ٣ ميجابايت'));
          continue;
        }
        const form = new FormData();
        form.append('image', optimized);
        const { data } = await api.post('/uploads/image', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const stored = normalizeImagePathForStorage(data?.path || data?.url);
        uploaded.push(stored || data?.url);
      }
      setFormData((prev) => ({
        ...prev,
        image_urls: [...prev.image_urls, ...uploaded.filter(Boolean)],
      }));
      setErrors((prev) => {
        if (!prev.image_urls) return prev;
        const next = { ...prev };
        delete next.image_urls;
        return next;
      });
    } catch (error) {
      console.error('Failed to upload image', error);
      alert(t('seller.uploadFailed', 'فشل رفع الصورة'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      image_urls: prev.image_urls.filter((img) => img !== url),
    }));
  };

  const handleSetPrimaryImage = (url: string) => {
    setFormData((prev) => {
      if (!prev.image_urls.includes(url)) return prev;
      const remaining = prev.image_urls.filter((img) => img !== url);
      return {
        ...prev,
        image_urls: [url, ...remaining],
      };
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-luxury p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-h3 text-charcoal mb-6">
          {mode === 'edit' ? t('admin.editTemplate', 'تعديل القالب') : t('admin.addTemplate', 'إضافة قالب')}
        </h3>

        {submitError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.titleEn', 'Title (EN)')}</label>
              <input
                type="text"
                value={formData.name_en}
                onChange={handleChange('name_en')}
                className={`w-full px-4 py-2 rounded-luxury border ${errors.name_en ? 'border-red-500' : 'border-gray-300'} focus:border-gold focus:outline-none`}
                required
              />
              {errors.name_en && <p className="text-sm text-red-600 mt-1">{errors.name_en}</p>}
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.titleAr', 'Title (AR)')}</label>
              <input
                type="text"
                value={formData.name_ar}
                onChange={handleChange('name_ar')}
                className={`w-full px-4 py-2 rounded-luxury border ${errors.name_ar ? 'border-red-500' : 'border-gray-300'} focus:border-gold focus:outline-none`}
                required
              />
              {errors.name_ar && <p className="text-sm text-red-600 mt-1">{errors.name_ar}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.brand', 'Brand')}</label>
              <input
                type="text"
                value={formData.brand}
                onChange={handleChange('brand')}
                className={`w-full px-4 py-2 rounded-luxury border ${errors.brand ? 'border-red-500' : 'border-gray-300'} focus:border-gold focus:outline-none`}
                required
              />
              {errors.brand && <p className="text-sm text-red-600 mt-1">{errors.brand}</p>}
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.category', 'Category')}</label>
              <input
                type="text"
                value={formData.category}
                onChange={handleChange('category')}
                className={`w-full px-4 py-2 rounded-luxury border ${errors.category ? 'border-red-500' : 'border-gray-300'} focus:border-gold focus:outline-none`}
                required
              />
              {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.type', 'Type')}</label>
              <select
                value={formData.product_type}
                onChange={handleChange('product_type')}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
              >
                <option value="EDP">EDP</option>
                <option value="EDT">EDT</option>
                <option value="EDC">EDC</option>
                <option value="Parfum">Parfum</option>
              </select>
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.price', 'Price')}</label>
              <input
                type="number"
                step="0.01"
                value={formData.base_price}
                onChange={handleChange('base_price')}
                className={`w-full px-4 py-2 rounded-luxury border ${errors.base_price ? 'border-red-500' : 'border-gray-300'} focus:border-gold focus:outline-none`}
                required
              />
              {errors.base_price && <p className="text-sm text-red-600 mt-1">{errors.base_price}</p>}
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.size', 'Size (ml)')}</label>
              <input
                type="number"
                value={formData.size_ml}
                onChange={handleChange('size_ml')}
                className={`w-full px-4 py-2 rounded-luxury border ${errors.size_ml ? 'border-red-500' : 'border-gray-300'} focus:border-gold focus:outline-none`}
                required
              />
              {errors.size_ml && <p className="text-sm text-red-600 mt-1">{errors.size_ml}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.concentration', 'Concentration')}</label>
              <input
                type="text"
                value={formData.concentration}
                onChange={handleChange('concentration')}
                className={`w-full px-4 py-2 rounded-luxury border ${errors.concentration ? 'border-red-500' : 'border-gray-300'} focus:border-gold focus:outline-none`}
                required
              />
              {errors.concentration && <p className="text-sm text-red-600 mt-1">{errors.concentration}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.descriptionEn', 'Description (EN)')}</label>
              <textarea
                value={formData.description_en}
                onChange={handleChange('description_en')}
                className={`w-full px-4 py-2 rounded-luxury border ${errors.description_en ? 'border-red-500' : 'border-gray-300'} focus:border-gold focus:outline-none`}
                rows={3}
              />
              {errors.description_en && <p className="text-sm text-red-600 mt-1">{errors.description_en}</p>}
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.descriptionAr', 'Description (AR)')}</label>
              <textarea
                value={formData.description_ar}
                onChange={handleChange('description_ar')}
                className={`w-full px-4 py-2 rounded-luxury border ${errors.description_ar ? 'border-red-500' : 'border-gray-300'} focus:border-gold focus:outline-none`}
                rows={3}
              />
              {errors.description_ar && <p className="text-sm text-red-600 mt-1">{errors.description_ar}</p>}
            </div>
          </div>

          <div>
            <label className="block text-charcoal font-semibold mb-2">{t('seller.images', 'Images')}</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none bg-white"
              disabled={uploading}
            />
            <p className="text-sm text-taupe mt-1">
              {uploading ? t('seller.uploading', 'جاري الرفع...') : t('seller.imageUploadHint', 'PNG أو JPG حتى ٥ ميجابايت')}
            </p>
            {formData.image_urls.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {formData.image_urls.map((url) => {
                      const preview = resolveImageUrl(url) || url;
                      return (
                        <div
                          key={url}
                          className="relative aspect-square min-h-[110px] border border-gray-200 rounded-lg bg-sand/40 flex items-center justify-center overflow-hidden"
                        >
                          <div className="absolute inset-3 rounded-lg bg-white/90 border border-gray-100 flex items-center justify-center overflow-hidden">
                            <img src={preview} alt="Template" className="max-h-full max-w-full object-contain" />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(url)}
                            className="absolute top-2 right-2 bg-white/90 text-red-600 rounded-full w-7 h-7 flex items-center justify-center text-sm shadow"
                          >
                            ×
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(url)}
                            className="absolute bottom-2 left-2 bg-charcoal/85 text-white text-xs px-2 py-1 rounded-full shadow hover:bg-charcoal transition"
                          >
                            {t('seller.setPrimaryImage', 'Set as cover image')}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
            {errors.image_urls && <p className="text-sm text-red-600 mt-2">{errors.image_urls}</p>}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-luxury border border-gray-300 text-charcoal hover:bg-gray-100"
              disabled={loading || uploading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover disabled:opacity-50"
              disabled={loading || uploading}
            >
              {loading ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
