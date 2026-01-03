import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import api from '../lib/api';
import { Product, ProductTemplate } from '../types';
import { useUIStore } from '../store/uiStore';
import { formatPrice } from '../utils/currency';
import { normalizeImagePathForStorage, resolveProductImageUrl } from '../utils/image';
import { compressImageFile } from '../utils/imageCompression';
import { sellerSearchTemplates } from '../services/productTemplateService';
import { PLACEHOLDER_PERFUME } from '../utils/staticAssets';
import SARIcon from '../components/common/SARIcon';
import { useNotificationStore } from '../store/notificationStore';

type StatusFilter = 'all' | 'published' | 'draft' | 'pending' | 'rejected';

const statusOptions: StatusFilter[] = ['all', 'published', 'draft', 'pending', 'rejected'];

const productStatusLabel = (
  status: string,
  t: ReturnType<typeof useTranslation>['t']
) => {
  switch (status) {
    case 'published':
      return t('seller.published', 'Published');
    case 'draft':
      return t('seller.draft', 'Draft');
    case 'pending':
      return t('seller.pending', 'Pending');
    case 'rejected':
      return t('seller.rejected', 'Rejected');
    default:
      return status;
  }
};

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'published':
      return 'text-green-600 bg-green-100';
    case 'draft':
      return 'text-gray-600 bg-gray-100';
    case 'pending':
      return 'text-gold bg-gold bg-opacity-10';
    case 'rejected':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

const convertArabicDigits = (value: string) => {
  const arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return value.replace(/[٠-٩]/g, (d) => String(arabic.indexOf(d)));
};

const parseNumericInput = (value: string) => {
  if (!value) return NaN;
  const normalized = convertArabicDigits(value)
    .replace(/[٬,]/g, '')
    .replace(/٫/g, '.')
    .replace(/[^\d.]/g, '');
  return normalized ? parseFloat(normalized) : NaN;
};

export default function SellerProductsPage() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const lastNotification = useNotificationStore((state) => state.lastNotification);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [statusFilter]);

  useEffect(() => {
    if (!lastNotification) return;
    if (['product_approved', 'product_rejected'].includes(lastNotification.type)) {
      fetchProducts();
    }
  }, [lastNotification]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : undefined;
      const response = await api.get('/seller/products', { params });
      const items = Array.isArray(response.data) ? response.data : [];
      const withoutAuctions = items.filter(
        (product) => !product.is_auction_product && !product.has_active_auction
      );
      setProducts(withoutAuctions);
    } catch (error) {
      console.error('Failed to load seller products', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (searchTerm.trim() === '') return products;
    const normalized = searchTerm.toLowerCase();
    return products.filter((product) => {
      return (
        product.name_en.toLowerCase().includes(normalized) ||
        product.name_ar.includes(searchTerm) ||
        product.brand.toLowerCase().includes(normalized)
      );
    });
  }, [products, searchTerm]);

  const handleStatusChange = async (productId: number, newStatus: string) => {
    try {
      const normalized =
        newStatus === 'published' ? 'pending' : newStatus; // البائع يطلب المراجعة بدلاً من النشر المباشر
      await api.patch(`/seller/products/${productId}`, { status: normalized });
      fetchProducts();
    } catch (error: any) {
      console.error('Failed to update status', error);
      const msg = error.response?.data?.message || error.response?.data?.detail;
      alert(msg || t('seller.updateFailed', 'Failed to update product'));
    }
  };

  const handleSavePrice = async (productId: number) => {
    const priceValue = parseNumericInput(editPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      alert(t('seller.invalidPrice', 'Please enter a valid price'));
      return;
    }

    try {
      await api.patch(`/seller/products/${productId}`, { basePrice: priceValue });
      setEditingId(null);
      setEditPrice('');
      fetchProducts();
    } catch (error: any) {
      console.error('Failed to update price', error);
      const msg = error.response?.data?.message || error.response?.data?.detail;
      alert(msg || t('seller.updateFailed', 'Failed to update product'));
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (product.has_active_auction) {
      alert(t('seller.deleteProductActive', 'You must end the auction before deleting this product.'));
      return;
    }
    if (product.is_auction_product) {
      alert(t('seller.deleteProductDisabled', 'This product is part of an auction and cannot be deleted.'));
      return;
    }
    const confirmMessage = t(
      'seller.deleteProductConfirm',
      'Delete this product permanently?'
    );
    if (typeof window !== 'undefined' && !window.confirm(confirmMessage)) {
      return;
    }
    try {
      setDeletingId(product.id);
      await api.delete(`/seller/products/${product.id}`);
      fetchProducts();
    } catch (error: any) {
      console.error('Failed to delete product', error);
      const msg = error.response?.data?.message || error.response?.data?.detail;
      alert(msg || t('seller.deleteProductFailed', 'Failed to delete product'));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-h2 text-charcoal">{t('seller.products')}</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gold text-charcoal px-4 py-2 rounded-luxury font-semibold hover:bg-gold-hover transition"
          >
            + {t('seller.addProduct')}
          </button>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <input
            type="text"
            placeholder={t('seller.searchProducts')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
          />
          <div className="flex gap-2 flex-wrap">
            {statusOptions.map((option) => (
              <button
                key={option}
                onClick={() => setStatusFilter(option)}
                className={`px-4 py-2 rounded-luxury text-sm font-semibold ${
                  statusFilter === option ? 'bg-gold text-charcoal' : 'bg-sand text-charcoal-light'
                }`}
              >
                {option === 'all' ? t('seller.allStatuses', 'All statuses') : productStatusLabel(option, t)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm md:text-base">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-3 md:px-4 py-3 text-charcoal font-semibold text-xs md:text-sm">{t('seller.id')}</th>
                <th className="text-right px-3 md:px-4 py-3 text-charcoal font-semibold text-xs md:text-sm">{t('seller.title')}</th>
                <th className="text-right px-3 md:px-4 py-3 text-charcoal font-semibold text-xs md:text-sm">{t('seller.brand')}</th>
                <th className="text-right px-3 md:px-4 py-3 text-charcoal font-semibold text-xs md:text-sm">{t('seller.type')}</th>
                <th className="text-right px-3 md:px-4 py-3 text-charcoal font-semibold text-xs md:text-sm">{t('seller.price')}</th>
                <th className="text-right px-3 md:px-4 py-3 text-charcoal font-semibold text-xs md:text-sm">{t('seller.status')}</th>
                <th className="text-right px-3 md:px-4 py-3 text-charcoal font-semibold text-xs md:text-sm">{t('seller.createdAt')}</th>
                <th className="text-right px-3 md:px-4 py-3 text-charcoal font-semibold text-xs md:text-sm">{t('seller.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <tr key={product.id} className="border-b border-gray-100 hover:bg-sand transition">
                  <td className="px-3 md:px-4 py-4 text-charcoal-light">{index + 1}</td>
                  <td className="px-3 md:px-4 py-4 text-charcoal font-medium">
                    {i18n.language === 'ar' ? product.name_ar : product.name_en}
                  </td>
                  <td className="px-3 md:px-4 py-4 text-charcoal-light">{product.brand}</td>
                  <td className="px-3 md:px-4 py-4 text-charcoal-light">{product.product_type}</td>
                  <td className="px-3 md:px-4 py-4">
                    {editingId === product.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-24 px-2 py-1 border border-gold rounded"
                        />
                        <button
                          onClick={() => handleSavePrice(product.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-red-600 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => {
                          setEditingId(product.id);
                          setEditPrice(product.base_price.toString());
                        }}
                        className="inline-flex items-center gap-1 text-charcoal font-semibold cursor-pointer hover:text-gold"
                      >
                        <span>{formatPrice(product.base_price, language).replace(/\s?(SAR|﷼)$/i, '')}</span>
                        <SARIcon size={16} />
                      </span>
                    )}
                  </td>
                  <td className="px-3 md:px-4 py-4">
                    {product.status === 'published' ? (
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center ${statusBadgeClass(product.status)}`}
                      >
                        {productStatusLabel(product.status, t)}
                      </span>
                    ) : (
                      <select
                        value={product.status}
                        onChange={(e) => handleStatusChange(product.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadgeClass(product.status)} border-none`}
                      >
                        <option value="pending">{t('seller.pending', 'Pending review')}</option>
                        <option value="draft">{t('seller.draft', 'Draft')}</option>
                        <option value="rejected">{t('seller.rejected', 'Rejected')}</option>
                      </select>
                    )}
                  </td>
                  <td className="px-3 md:px-4 py-4 text-charcoal-light">
                    {new Date(product.created_at).toLocaleDateString(
                      i18n.language === 'ar' ? 'ar-EG' : 'en-US'
                    )}
                  </td>
                  <td className="px-3 md:px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="px-2 py-1 rounded-full border border-gold text-charcoal hover:bg-gold/10 transition"
                        aria-label={t('seller.moreActions', 'المزيد من الإجراءات')}
                      >
                        ⋮
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product)}
                        disabled={Boolean(product.is_auction_product) || deletingId === product.id}
                        title={
                          product.is_auction_product
                            ? t('seller.deleteProductTooltip', 'Auction products cannot be deleted')
                            : undefined
                        }
                        className={`px-3 py-1 rounded-full border text-sm font-semibold transition ${
                          product.is_auction_product
                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'border-red-500 text-red-600 hover:bg-red-50'
                        } ${deletingId === product.id ? 'opacity-60 cursor-wait' : ''}`}
                      >
                        {deletingId === product.id ? t('common.loading') : t('common.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-taupe">{t('seller.noProducts')}</p>
          </div>
        )}
      </div>

      <ProductFormModal
        mode="add"
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          fetchProducts();
        }}
      />

      <ProductFormModal
        mode="edit"
        product={editingProduct || undefined}
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        onSuccess={() => {
          setEditingProduct(null);
          fetchProducts();
        }}
      />
    </div>
  );
}

type ProductFormModalProps = {
  mode: 'add' | 'edit';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product;
};

type ProductFormState = {
  name_en: string;
  name_ar: string;
  brand: string;
  product_type: string;
  category: string;
  base_price: string;
  size_ml: string;
  concentration: string;
  stock_quantity: string;
  description_en: string;
  description_ar: string;
  image_urls: string[];
  condition: 'NEW' | 'USED';
  is_tester: boolean;
};

const createInitialFormState = (): ProductFormState => ({
  name_en: '',
  name_ar: '',
  brand: '',
  product_type: 'EDP',
  category: '',
  base_price: '',
  size_ml: '',
  concentration: 'N/A',
  stock_quantity: '',
  description_en: '',
  description_ar: '',
  image_urls: [],
  condition: 'NEW',
  is_tester: false,
});

function ProductFormModal({ mode, isOpen, onClose, onSuccess, product }: ProductFormModalProps) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formData, setFormData] = useState<ProductFormState>(() => createInitialFormState());
  const [templateQuery, setTemplateQuery] = useState('');
  const [templateResults, setTemplateResults] = useState<ProductTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (mode === 'edit' && product) {
      setFormData({
        name_en: product.name_en || '',
        name_ar: product.name_ar || '',
        brand: product.brand || '',
        product_type: product.product_type || '',
        category: product.category || '',
        base_price: product.base_price?.toString?.() || '',
        size_ml: product.size_ml?.toString?.() || '',
        concentration: product.concentration || '',
        stock_quantity: product.stock_quantity?.toString?.() || '',
        description_en: product.description_en || '',
        description_ar: product.description_ar || '',
        image_urls: product.image_urls
          ? product.image_urls
              .map((url) => normalizeImagePathForStorage(url) || '')
              .filter(Boolean)
          : [],
        condition: (product.condition?.toUpperCase?.() === 'USED' ? 'USED' : 'NEW'),
        is_tester: Boolean(product.is_tester),
      });
      setSelectedTemplateId(null);
    } else if (mode === 'add') {
      setFormData(createInitialFormState());
      setSelectedTemplateId(null);
      setTemplateQuery('');
    }
  }, [isOpen, mode, product]);

  useEffect(() => {
    if (!isOpen) return;
    const term = templateQuery.trim();
    if (term.length === 1) {
      return;
    }
    let cancelled = false;
    setTemplatesLoading(true);
    (async () => {
      try {
        const templates = await sellerSearchTemplates({
          limit: 8,
          ...(term ? { search: term } : {}),
        });
        if (!cancelled) {
          setTemplateResults(templates.items);
          setTemplateError(null);
        }
      } catch (_error) {
        if (!cancelled) {
          setTemplateError(t('seller.templateLoadFailed', 'فشل تحميل القوالب'));
        }
      } finally {
        if (!cancelled) {
          setTemplatesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, templateQuery, t]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent, intent: 'draft' | 'publish' = 'draft') => {
    event.preventDefault();
    try {
      setLoading(true);
      if (formData.image_urls.length === 0) {
        alert(t('seller.imageRequired', 'Please upload at least one image'));
        return;
      }

      const imageUrls = formData.image_urls;
      const parsedPrice = parseNumericInput(formData.base_price);
      const parsedSize = parseInt(convertArabicDigits(formData.size_ml || '0'), 10);
      const parsedStock = parseInt(convertArabicDigits(formData.stock_quantity || '0'), 10);

      if (!parsedPrice || Number.isNaN(parsedPrice)) {
        alert(t('seller.invalidPrice', 'Please enter a valid price'));
        return;
      }

      const payload = {
        nameEn: formData.name_en,
        nameAr: formData.name_ar,
        brand: formData.brand,
        productType: formData.product_type,
        category: formData.category,
        basePrice: parsedPrice,
        sizeMl: parsedSize,
        concentration: formData.concentration,
        stockQuantity: parsedStock,
        descriptionEn: formData.description_en,
        descriptionAr: formData.description_ar,
        condition: formData.condition || 'NEW',
        isTester: formData.is_tester,
        imageUrls,
        status: intent === 'draft' ? 'DRAFT' : 'PENDING_REVIEW',
      };

      if (mode === 'add') {
        await api.post('/seller/products', payload);
      } else if (product) {
        await api.patch(`/seller/products/${product.id}`, payload);
      }

      onSuccess();
      if (mode === 'add') {
        setFormData(createInitialFormState());
      }
    } catch (error: any) {
      console.error('Failed to create product', error);
      let msg = error.response?.data?.message || error.response?.data?.detail;

      const fieldErrors = error.response?.data?.errors?.fieldErrors;
      if (!msg && fieldErrors && typeof fieldErrors === 'object') {
        const firstError = Object.values(fieldErrors)
          .flat()
          .find((entry) => typeof entry === 'string');
        if (firstError) {
          msg = firstError;
        }
      }

      if (!msg && typeof error.message === 'string') {
        msg = error.message;
      }
      alert(
        msg ||
          (mode === 'add'
            ? t('seller.addFailed', 'Failed to add product')
            : t('seller.updateFailed', 'Failed to update product'))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange =
    (field: keyof Omit<ProductFormState, 'image_urls' | 'is_tester'>) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const applyTemplate = (template: ProductTemplate) => {
    setSelectedTemplateId(template.id);
    setFormData({
      name_en: template.name_en || '',
      name_ar: template.name_ar || '',
      brand: template.brand || '',
      product_type: template.product_type || 'EDP',
      category: template.category || '',
      base_price: (template.base_price ?? '').toString(),
      size_ml: (template.size_ml ?? '').toString(),
      concentration: template.concentration || 'N/A',
      stock_quantity: '',
      description_en: template.description_en || '',
      description_ar: template.description_ar || '',
      image_urls: template.image_urls?.slice?.() || [],
      condition: 'NEW',
      is_tester: false,
    });
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (!files.length) return;

    try {
      setUploadingImages(true);
      const uploadedPaths: string[] = [];
      const MAX_BYTES = 3 * 1024 * 1024;
      for (const file of files) {
        const optimized = await compressImageFile(file, { maxBytes: MAX_BYTES });
        if (optimized.size > MAX_BYTES) {
          alert(t('seller.imageTooLarge', 'حجم الصورة يجب ألا يتجاوز ٣ ميجابايت'));
          continue;
        }
        const formDataPayload = new FormData();
        formDataPayload.append('image', optimized);
        const { data } = await api.post('/uploads/image', formDataPayload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const stored = normalizeImagePathForStorage(data?.path || data?.url);
        const fallback = data?.path || data?.url;
        if (stored) {
          uploadedPaths.push(stored);
        } else if (fallback) {
          uploadedPaths.push(fallback);
        }
      }
      setFormData((prev) => ({
        ...prev,
        image_urls: [...prev.image_urls, ...uploadedPaths.filter(Boolean)],
      }));
    } catch (error: any) {
      console.error('Failed to upload image', error);
      alert(error.response?.data?.message || t('seller.uploadFailed', 'Failed to upload image'));
    } finally {
      setUploadingImages(false);
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
      <div className="bg-white rounded-luxury p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-h3 text-charcoal mb-6">
          {mode === 'add' ? t('seller.addProduct') : t('seller.editProduct', 'Edit product')}
        </h3>
        <form onSubmit={(e) => handleSubmit(e, 'draft')} className="space-y-4">
          {mode === 'add' && (
            <div className="space-y-3 rounded-luxury border border-gray-200 bg-sand/30 p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                  <label className="block text-charcoal font-semibold mb-1">{t('seller.templateLibraryTitle', 'منتجات جاهزة من الإدارة')}</label>
                  <input
                    type="text"
                    value={templateQuery}
                    onChange={(e) => setTemplateQuery(e.target.value)}
                    placeholder={t('seller.templateSearchPlaceholder', 'ابحث عن منتج جاهز...')}
                    className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateQuery('');
                    setSelectedTemplateId(null);
                  }}
                  className="px-4 py-2 rounded-luxury border border-gray-300 text-charcoal hover:bg-white"
                >
                  {t('seller.templateClear', 'إعادة التعيين')}
                </button>
              </div>
              <p className="text-sm text-taupe">{t('seller.templateHint', 'اختر قالباً احترافياً ثم عدّل التفاصيل قبل النشر')}</p>
              <div className="space-y-2">
                {templatesLoading && (
                  <p className="text-sm text-taupe">{t('common.loading')}</p>
                )}
                {!templatesLoading && templateError && (
                  <p className="text-sm text-red-600">{templateError}</p>
                )}
                {!templatesLoading && !templateError && templateResults.length === 0 && (
                  <p className="text-sm text-taupe">{t('seller.templateNoResults', 'لا توجد قوالب')}</p>
                )}
                {!templatesLoading && templateResults.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {templateResults.map((template) => {
                      const title = i18n.language === 'ar' ? template.name_ar : template.name_en;
                      const preview = resolveProductImageUrl(template.image_urls?.[0]) || PLACEHOLDER_PERFUME;
                      const isActive = selectedTemplateId === template.id;
                      return (
                        <button
                          type="button"
                          key={template.id}
                          onClick={() => applyTemplate(template)}
                          className={`flex items-center gap-3 rounded-luxury border p-3 text-left transition hover:border-gold ${
                            isActive ? 'border-gold bg-white' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <img src={preview} alt={title} className="w-20 h-20 rounded-lg object-contain bg-white" />
                          <div className="flex-1">
                            <p className="font-semibold text-charcoal">{title}</p>
                            <p className="text-sm text-taupe">{template.brand}</p>
                            <span className={`inline-flex items-center gap-1 text-xs mt-1 ${isActive ? 'text-green-600' : 'text-gold'}`}>
                              {isActive ? t('seller.templateApplied', 'تم التطبيق') : t('seller.templateApply', 'استخدام القالب')}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.titleEn', 'Title (EN)')}</label>
              <input
                type="text"
                value={formData.name_en}
                onChange={handleChange('name_en')}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.titleAr', 'Title (AR)')}</label>
              <input
                type="text"
                value={formData.name_ar}
                onChange={handleChange('name_ar')}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.brand', 'Brand')}</label>
              <input
                type="text"
                value={formData.brand}
                onChange={handleChange('brand')}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.category', 'Category')}</label>
              <input
                type="text"
                value={formData.category}
                onChange={handleChange('category')}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                required
              />
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
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.stock', 'Stock quantity')}</label>
              <input
                type="number"
                value={formData.stock_quantity}
                onChange={handleChange('stock_quantity')}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.condition', 'Condition')}</label>
              <select
                value={formData.condition}
                onChange={handleChange('condition')}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
              >
                <option value="NEW">{t('seller.conditionNew', 'New')}</option>
                <option value="USED">{t('seller.conditionUsed', 'Used')}</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-7">
              <input
                id="seller-product-tester"
                type="checkbox"
                checked={formData.is_tester}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, is_tester: event.target.checked }))
                }
                className="h-4 w-4 accent-gold"
              />
              <label htmlFor="seller-product-tester" className="text-charcoal font-semibold">
                {t('products.tester', 'Tester')}
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.size', 'Size (ml)')}</label>
              <input
                type="number"
                value={formData.size_ml}
                onChange={handleChange('size_ml')}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.descriptionEn', 'Description (EN)')}</label>
              <textarea
                value={formData.description_en}
                onChange={handleChange('description_en')}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.descriptionAr', 'Description (AR)')}</label>
              <textarea
                value={formData.description_ar}
                onChange={handleChange('description_ar')}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                rows={3}
              />
            </div>
          </div>

          <div>
            <label className="block text-charcoal font-semibold mb-2">{t('seller.images', 'Images')}</label>
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none bg-white"
                disabled={uploadingImages}
              />
              <p className="text-sm text-taupe">
                {uploadingImages
                  ? t('seller.uploading', 'Uploading images...')
                  : t('seller.imageUploadHint', 'PNG, JPG or WEBP up to 5MB each.')}
              </p>
              {formData.image_urls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {formData.image_urls.map((url) => {
                    const preview = resolveProductImageUrl(url) || url;
                    return (
                    <div key={url} className="relative border border-gray-200 rounded-lg overflow-hidden">
                      <img src={preview} alt="Product" className="w-full h-28 object-contain bg-white" />
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
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-luxury border border-gray-300 text-charcoal hover:bg-gray-100"
              disabled={loading || uploadingImages}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-luxury bg-sand text-charcoal font-semibold hover:bg-sand/80 disabled:opacity-50"
              disabled={loading || uploadingImages}
            >
              {loading || uploadingImages ? t('common.loading') : t('seller.saveDraft', 'حفظ كمسودة')}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'publish')}
              className="px-4 py-2 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover disabled:opacity-50"
              disabled={loading || uploadingImages}
            >
              {loading || uploadingImages ? t('common.loading') : t('seller.submitForReview', 'إرسال للمراجعة')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
