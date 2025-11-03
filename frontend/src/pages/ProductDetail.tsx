import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Product } from '../types';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { formatPrice } from '../utils/currency';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
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
      await api.post('/orders', {
        product_id: product?.id,
        quantity,
        unit_price: product?.base_price,
        payment_method: 'COD',
        shipping_address: 'To be provided'
      });
      navigate('/orders');
    } catch (error: any) {
      console.error('Failed to create order:', error);
      alert(error.response?.data?.detail || 'Failed to create order');
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
  const images = product.image_urls?.length > 0 ? product.image_urls : ['/placeholder-perfume.jpg'];
  const isInStock = product.stock_quantity > 0;

  return (
    <div>
      <button
        onClick={() => navigate('/products')}
        className="mb-6 text-gold hover:text-gold-light transition"
      >
        ← {t('common.back')}
      </button>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <div className="bg-ivory rounded-luxury overflow-hidden mb-4 aspect-square">
            <img
              src={images[selectedImage]}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-perfume.jpg';
              }}
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-20 h-20 rounded-luxury overflow-hidden border-2 transition ${
                    selectedImage === idx ? 'border-gold' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-luxury shadow-luxury">
          <h1 className="text-3xl font-bold text-charcoal mb-4">{name}</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <span className="text-4xl font-bold text-gold">
              {formatPrice(product.base_price, language)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${isInStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isInStock ? t('products.inStock') : t('products.outOfStock')}
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
          </div>

          {isInStock && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-charcoal font-medium">Quantity:</label>
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

              <button
                onClick={handleOrder}
                className="w-full bg-gold text-charcoal font-semibold py-3 rounded-luxury hover:bg-gold-light transition"
              >
                {t('products.addToCart')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
