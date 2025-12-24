import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Product } from '../types';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { formatPrice } from '../utils/currency';
import SARIcon from '../components/common/SARIcon';
import { resolveImageUrl } from '../utils/image';
import { PLACEHOLDER_PERFUME, PLACEHOLDER_PERFUME_KEY } from '../utils/staticAssets';
import ProductImageCarousel from '../components/products/ProductImageCarousel';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      if (!product) return;
      await api.post('/orders', {
        payment_method: 'COD',
        items: [
          {
            productId: product.id,
            quantity,
            unitPrice: product.base_price,
          },
        ],
        shipping: {
          name: 'Pending',
          phone: '0000000000',
          city: 'Riyadh',
          region: 'Riyadh',
          address: 'To be confirmed',
        },
      });
      navigate('/orders');
    } catch (error: any) {
      console.error('Failed to create order:', error);
      alert(error.response?.data?.message || error.response?.data?.detail || 'Failed to create order');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-charcoal-light">{t('common.loading')}</p>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const name = language === 'ar' ? product.name_ar : product.name_en;
  const description = language === 'ar' ? product.description_ar : product.description_en;
  const baseImages = product.image_urls?.length > 0 ? product.image_urls : [PLACEHOLDER_PERFUME_KEY];
  const images = baseImages.map((img) => resolveImageUrl(img) || PLACEHOLDER_PERFUME);
  const isInStock = product.stock_quantity > 0;
  const sellerName = product.seller?.full_name;
  const sellerVerified = product.seller?.verified_seller;
  const conditionLabel = product.condition === 'used' ? t('products.conditionUsed') : t('products.conditionNew');

  return (
    <div>
      <button
        onClick={() => navigate('/products')}
        className="mb-6 text-gold hover:text-gold-light transition"
      >
        ← {t('common.back')}
      </button>

      <div className="grid lg:grid-cols-2 gap-8">
        <ProductImageCarousel
          images={images}
          name={name}
          fallback={PLACEHOLDER_PERFUME}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        />

        <div className="bg-white p-8 rounded-luxury shadow-luxury">
          <h1 className="text-3xl font-bold text-charcoal mb-4">{name}</h1>
          
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <span className="text-4xl font-bold text-gold inline-flex items-center gap-2">
              {formatPrice(product.base_price, language).replace(/\s?(SAR|﷼)$/i, '')}
              <SARIcon size={22} className="text-gold" />
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${isInStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isInStock ? t('products.inStock') : t('products.outOfStock')}
            </span>
            <span className="text-sm text-charcoal-light">
              {t('catalog.condition')}: <span className="text-charcoal font-semibold">{conditionLabel}</span>
            </span>
          </div>

          <p className="text-charcoal-light mb-6 leading-relaxed">{description}</p>

          <div className="space-y-3 mb-6 border-t border-b border-gray-200 py-4">
            <div className="flex justify-between">
              <span className="text-charcoal-light">{t('common.brand')}:</span>
              <span className="text-charcoal font-semibold">{product.brand}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-light">{t('products.type')}:</span>
              <span className="text-charcoal font-semibold">{product.product_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-light">{t('products.size')}:</span>
              <span className="text-charcoal font-semibold">{product.size_ml} ml</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-light">{t('products.concentration')}:</span>
              <span className="text-charcoal font-semibold">{product.concentration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-light">{t('common.category')}:</span>
              <span className="text-charcoal font-semibold">{product.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-light">{t('catalog.condition')}:</span>
              <span className="text-charcoal font-semibold">{conditionLabel}</span>
            </div>
          </div>

          <div className="mb-6 rounded-luxury border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm text-charcoal-light">{t('products.seller')}</p>
                <p className="text-charcoal font-semibold">{sellerName ?? t('products.sellerUnknown')}</p>
              </div>
              {sellerVerified && (
                <span className="px-3 py-1 rounded-full text-xs bg-success text-white font-semibold">
                  {t('auction.verifiedSeller')}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {isInStock && (
              <div className="flex items-center gap-4">
                <label className="text-charcoal font-medium">{t('common.quantity')}</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 bg-charcoal-light text-ivory rounded hover:bg-charcoal transition"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    className="w-8 h-8 bg-charcoal-light text-ivory rounded hover:bg-charcoal transition"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleOrder}
              disabled={!isInStock}
              className="w-full bg-gold text-charcoal font-semibold py-3 rounded-luxury hover:bg-gold-light transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>{isInStock ? t('products.addToCart') : t('products.outOfStock')}</span>
              {!isInStock && (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 9l6 6M15 9l-6 6" />
                  <circle cx="12" cy="12" r="9" strokeWidth="2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
