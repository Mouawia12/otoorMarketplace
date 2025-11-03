import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { formatPrice } from '../utils/currency';

interface Product {
  id: number;
  title: string;
  titleAr: string;
  brand: string;
  type: string;
  price: number;
  status: 'published' | 'draft' | 'pending';
  createdAt: string;
}

export default function SellerProductsPage() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockProducts: Product[] = [
      { id: 1, title: 'Chanel No 5', titleAr: 'شانيل رقم 5', brand: 'Chanel', type: 'EDP', price: 150.00, status: 'published', createdAt: '2024-10-01' },
      { id: 2, title: 'Dior Sauvage', titleAr: 'ديور سوفاج', brand: 'Dior', type: 'EDT', price: 120.00, status: 'published', createdAt: '2024-10-02' },
      { id: 3, title: 'Tom Ford Oud Wood', titleAr: 'توم فورد أود وود', brand: 'Tom Ford', type: 'EDP', price: 280.00, status: 'draft', createdAt: '2024-10-03' },
      { id: 4, title: 'Creed Aventus', titleAr: 'كريد أفينتوس', brand: 'Creed', type: 'EDP', price: 350.00, status: 'published', createdAt: '2024-10-04' },
      { id: 5, title: 'Versace Eros', titleAr: 'فيرساتشي إيروس', brand: 'Versace', type: 'EDT', price: 95.00, status: 'pending', createdAt: '2024-10-05' },
    ];

    setProducts(mockProducts);
    setLoading(false);
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t('seller.confirmDelete'))) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleDuplicate = (product: Product) => {
    const newProduct = {
      ...product,
      id: Math.max(...products.map(p => p.id)) + 1,
      title: `${product.title} (Copy)`,
      titleAr: `${product.titleAr} (نسخة)`,
      status: 'draft' as const,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProducts([newProduct, ...products]);
  };

  const handleEditPrice = (id: number, currentPrice: number) => {
    setEditingId(id);
    setEditPrice(currentPrice.toString());
  };

  const handleSavePrice = (id: number) => {
    const price = parseFloat(editPrice);
    if (!isNaN(price) && price > 0) {
      setProducts(products.map(p => p.id === id ? { ...p, price } : p));
    }
    setEditingId(null);
  };

  const handleStatusChange = (id: number, newStatus: Product['status']) => {
    setProducts(products.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Product['status']) => {
    switch (status) {
      case 'published': return 'text-green-600 bg-green-100';
      case 'draft': return 'text-gray-600 bg-gray-200';
      case 'pending': return 'text-gold bg-gold bg-opacity-10';
      default: return 'text-gray-600 bg-gray-100';
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-sand text-charcoal px-4 py-2 rounded-luxury font-semibold hover:bg-taupe hover:bg-opacity-20 transition"
            >
              📥 {t('seller.importCSV')}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gold text-charcoal px-4 py-2 rounded-luxury font-semibold hover:bg-gold-hover transition"
            >
              + {t('seller.addProduct')}
            </button>
          </div>
        </div>

        {/* Filters */}
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
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
          >
            <option value="all">{t('seller.allStatuses')}</option>
            <option value="published">{t('seller.published')}</option>
            <option value="draft">{t('seller.draft')}</option>
            <option value="pending">{t('seller.pending')}</option>
          </select>
        </div>

        {/* Products Table */}
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
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('seller.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-gray-100 hover:bg-sand transition">
                  <td className="px-4 py-4 text-charcoal-light">{product.id}</td>
                  <td className="px-4 py-4 text-charcoal font-medium">
                    {i18n.language === 'ar' ? product.titleAr : product.title}
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">{product.brand}</td>
                  <td className="px-4 py-4 text-charcoal-light">{product.type}</td>
                  <td className="px-4 py-4">
                    {editingId === product.id ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-24 px-2 py-1 border border-gold rounded"
                          autoFocus
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
                        onClick={() => handleEditPrice(product.id, product.price)}
                        className="text-charcoal font-semibold cursor-pointer hover:text-gold"
                      >
                        {formatPrice(product.price, language)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={product.status}
                      onChange={(e) => handleStatusChange(product.id, e.target.value as Product['status'])}
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(product.status)} border-none`}
                    >
                      <option value="published">{t('seller.published')}</option>
                      <option value="draft">{t('seller.draft')}</option>
                      <option value="pending">{t('seller.pending')}</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">
                    {new Date(product.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDuplicate(product)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                        title={t('seller.duplicate')}
                      >
                        📋
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                        title={t('seller.delete')}
                      >
                        🗑️
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

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(newProduct) => {
          setProducts([newProduct, ...products]);
          setShowAddModal(false);
        }}
        nextId={Math.max(...products.map(p => p.id)) + 1}
      />

      {/* Import CSV Modal */}
      <ImportCSVModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={(importedProducts) => {
          setProducts([...importedProducts, ...products]);
          setShowImportModal(false);
        }}
        nextId={Math.max(...products.map(p => p.id)) + 1}
      />
    </div>
  );
}

function AddProductModal({ isOpen, onClose, onAdd, nextId }: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: Product) => void;
  nextId: number;
}) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    title: '',
    titleAr: '',
    brand: '',
    type: 'EDP',
    price: '',
  });
  const [images, setImages] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (images.length > 5) {
      alert(t('seller.maxImages'));
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const newProduct: Product = {
      id: nextId,
      title: formData.title,
      titleAr: formData.titleAr,
      brand: formData.brand,
      type: formData.type,
      price: parseFloat(formData.price),
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAdd(newProduct);
    setFormData({ title: '', titleAr: '', brand: '', type: 'EDP', price: '' });
    setImages([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-luxury p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-h3 text-charcoal mb-6">{t('seller.addProduct')}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.titleEn')}</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.titleAr')}</label>
              <input
                type="text"
                value={formData.titleAr}
                onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.brand')}</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('seller.type')}</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
              >
                <option value="EDP">EDP</option>
                <option value="EDT">EDT</option>
                <option value="EDC">EDC</option>
                <option value="Parfum">Parfum</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-charcoal font-semibold mb-2">{t('seller.price')}</label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-charcoal font-semibold mb-2">
              {t('seller.images')} ({images.length}/5)
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setImages(files.slice(0, 5));
              }}
              className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
            />
            <p className="text-sm text-taupe mt-1">{t('seller.maxImagesNote')}</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-gold text-charcoal px-6 py-3 rounded-luxury font-semibold hover:bg-gold-hover transition"
            >
              {t('seller.createProduct')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-sand text-charcoal px-6 py-3 rounded-luxury font-semibold hover:bg-taupe hover:bg-opacity-20 transition"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportCSVModal({ isOpen, onClose, onImport, nextId }: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: Product[]) => void;
  nextId: number;
}) {
  const { t } = useTranslation();
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const handleImport = async () => {
    if (!csvFile) return;

    await new Promise(resolve => setTimeout(resolve, 500));

    const mockImportedProducts: Product[] = [
      { id: nextId, title: 'Giorgio Armani Code', titleAr: 'جورجيو أرماني كود', brand: 'Giorgio Armani', type: 'EDT', price: 85.00, status: 'draft', createdAt: new Date().toISOString().split('T')[0] },
      { id: nextId + 1, title: 'Paco Rabanne Invictus', titleAr: 'باكو رابان إنفيكتوس', brand: 'Paco Rabanne', type: 'EDT', price: 75.00, status: 'draft', createdAt: new Date().toISOString().split('T')[0] },
      { id: nextId + 2, title: 'Yves Saint Laurent Y', titleAr: 'إيف سان لوران واي', brand: 'YSL', type: 'EDP', price: 110.00, status: 'draft', createdAt: new Date().toISOString().split('T')[0] },
    ];

    onImport(mockImportedProducts);
    setCsvFile(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-luxury p-6 max-w-lg w-full">
        <h3 className="text-h3 text-charcoal mb-4">{t('seller.importCSV')}</h3>
        <p className="text-taupe mb-4">{t('seller.csvFormat')}: title, brand, type, price, condition</p>

        <input
          type="file"
          accept=".csv"
          onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
          className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={handleImport}
            disabled={!csvFile}
            className="flex-1 bg-gold text-charcoal px-6 py-3 rounded-luxury font-semibold hover:bg-gold-hover transition disabled:opacity-50"
          >
            {t('seller.import')}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-sand text-charcoal px-6 py-3 rounded-luxury font-semibold hover:bg-taupe hover:bg-opacity-20 transition"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
