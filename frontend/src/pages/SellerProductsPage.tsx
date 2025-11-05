import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import api from '../lib/api';
import { Product } from '../types';
import { useUIStore } from '../store/uiStore';
import { formatPrice } from '../utils/currency';

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

export default function SellerProductsPage() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : undefined;
      const response = await api.get('/seller/products', { params });
      setProducts(response.data);
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
      await api.patch(`/seller/products/${productId}`, { status: newStatus });
      fetchProducts();
    } catch (error: any) {
      console.error('Failed to update status', error);
      alert(error.response?.data?.detail || t('seller.updateFailed', 'Failed to update product'));
    }
  };

  const handleSavePrice = async (productId: number) => {
    const priceValue = parseFloat(editPrice);
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
      alert(error.response?.data?.detail || t('seller.updateFailed', 'Failed to update product'));
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

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder={t('seller.searchProducts')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
            {option === 'all' ? t('seller.allStatuses', 'All statuses') : productStatusLabel(option, t)}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.id')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.title')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.brand')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.type')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.price')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.status')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.createdAt')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-gray-100 hover:bg-sand transition">
                  <td className="px-4 py-4 text-charcoal-light">{product.id}</td>
                  <td className="px-4 py-4 text-charcoal font-medium">
                    {i18n.language === 'ar' ? product.name_ar : product.name_en}
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">{product.brand}</td>
                  <td className="px-4 py-4 text-charcoal-light">{product.product_type}</td>
                  <td className="px-4 py-4">
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
                        className="text-charcoal font-semibold cursor-pointer hover:text-gold"
                      >
                        {formatPrice(product.base_price, language)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={product.status}
                      onChange={(e) => handleStatusChange(product.id, e.target.value)}
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadgeClass(product.status)} border-none`}
                    >
                    <option value="published">{t('seller.published', 'Published')}</option>
                    <option value="draft">{t('seller.draft', 'Draft')}</option>
                    <option value="pending">{t('seller.pending', 'Pending')}</option>
                    <option value="rejected">{t('seller.rejected', 'Rejected')}</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">
                    {new Date(product.created_at).toLocaleDateString(
                      i18n.language === 'ar' ? 'ar-EG' : 'en-US'
                    )}
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

      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={() => {
          setShowAddModal(false);
          fetchProducts();
        }}
      />
    </div>
  );
}

type AddProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
};

function AddProductModal({ isOpen, onClose, onCreated }: AddProductModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    brand: '',
    product_type: 'EDP',
    category: '',
    base_price: '',
    size_ml: '',
    concentration: '',
    stock_quantity: '',
    description_en: '',
    description_ar: '',
    image_urls: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      await api.post('/seller/products', {
        nameEn: formData.name_en,
        nameAr: formData.name_ar,
        brand: formData.brand,
        productType: formData.product_type,
        category: formData.category,
        basePrice: parseFloat(formData.base_price),
        sizeMl: parseInt(formData.size_ml || '0', 10),
        concentration: formData.concentration,
        stockQuantity: parseInt(formData.stock_quantity || '0', 10),
        descriptionEn: formData.description_en,
        descriptionAr: formData.description_ar,
        condition: 'NEW',
        imageUrls: formData.image_urls
          .split(',')
          .map((url) => url.trim())
          .filter(Boolean),
      });
      onCreated();
      setFormData({
        name_en: '',
        name_ar: '',
        brand: '',
        product_type: 'EDP',
        category: '',
        base_price: '',
        size_ml: '',
        concentration: '',
        stock_quantity: '',
        description_en: '',
        description_ar: '',
        image_urls: '',
      });
    } catch (error: any) {
      console.error('Failed to create product', error);
      alert(error.response?.data?.detail || t('seller.addFailed', 'Failed to add product'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-luxury p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-h3 text-charcoal mb-6">{t('seller.addProduct')}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-charcoal font-semibold mb-2">{t('seller.size', 'Size (ml)')}</label>
              <input
                type="number"
                value={formData.size_ml}
                onChange={handleChange('size_ml')}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.concentration', 'Concentration')}</label>
              <input
                type="text"
                value={formData.concentration}
                onChange={handleChange('concentration')}
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
            <label className="block text-charcoal font-semibold mb-2">{t('seller.imageUrls', 'Image URLs')}</label>
            <input
              type="text"
              value={formData.image_urls}
              onChange={handleChange('image_urls')}
              className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
              placeholder="https://... , https://..."
            />
            <p className="text-sm text-taupe mt-1">{t('seller.imageUrlsHint', 'Separate multiple URLs with commas')}</p>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-luxury border border-gray-300 text-charcoal hover:bg-gray-100"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover disabled:opacity-50"
              disabled={loading}
            >
              {loading ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
