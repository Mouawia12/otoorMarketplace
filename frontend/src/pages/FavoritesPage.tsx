import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import ProductCard from '../components/products/ProductCard';
import { Product } from '../types';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function FavoritesPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!isAuthenticated) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/wishlist');
        const items = response.data.items ?? [];
        const products: Product[] = items
          .map((item: any) => {
            const p = item.product;
            if (!p) return null;
            return {
              ...p,
              base_price: typeof p.base_price === 'number' ? p.base_price : Number(p.base_price ?? 0),
              image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
            } as Product;
          })
          .filter(Boolean) as Product[];
        setFavorites(products);
      } catch (error) {
        console.error('Failed to load wishlist', error);
        setError(t('common.errorLoading'));
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [isAuthenticated]);

  const handleRemoveFavorite = async (productId: number) => {
    try {
      if (isAuthenticated) {
        await api.delete(`/wishlist/${productId}`);
      }
      setFavorites((prev) => prev.filter((p) => p.id !== productId));
    } catch (error) {
      console.error('Failed to remove wishlist item', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.loading')}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-luxury p-6 shadow-luxury text-center">
        <p className="text-charcoal mb-4">{t('wishlist.loginRequired', 'يجب تسجيل الدخول لرؤية المفضلة')}</p>
        <a
          href="/login"
          className="inline-block bg-gold text-charcoal px-6 py-2 rounded-luxury font-semibold hover:bg-gold-hover transition"
        >
          {t('common.login')}
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-luxury p-6 shadow-luxury">
      <h1 className="text-h2 text-charcoal mb-6">{t('account.favorites')}</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-luxury mb-4">
          {error}
        </div>
      )}

      {favorites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-taupe mb-2">❤️</p>
          <p className="text-taupe mb-4">{t('account.noFavorites')}</p>
          <a
            href="/new"
            className="inline-block bg-gold text-charcoal px-6 py-2 rounded-luxury font-semibold hover:bg-gold-hover transition"
          >
            {t('favorites.browseProducts')}
          </a>
        </div>
      ) : (
        <>
          <p className="text-taupe mb-6">
            {t('favorites.count', { count: favorites.length })}
          </p>
          <div className="responsive-card-grid responsive-card-grid--roomy">
            {favorites.map((product) => (
              <div key={product.id} className="relative">
                <ProductCard product={product} />
                <button
                  onClick={() => handleRemoveFavorite(product.id)}
                  className="absolute top-2 left-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition z-10"
                  title={t('favorites.remove')}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
