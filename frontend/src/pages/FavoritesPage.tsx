import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ProductCard from '../components/products/ProductCard';
import { Product } from '../types';

export default function FavoritesPage() {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockFavorites: Product[] = [
        {
          id: 1,
          seller_id: 1,
          name_ar: 'شانيل رقم 5',
          name_en: 'Chanel No 5',
          description_ar: 'عطر كلاسيكي فاخر',
          description_en: 'Classic luxury perfume',
          product_type: 'eau_de_parfum',
          brand: 'Chanel',
          category: 'floral',
          base_price: 150.00,
          size_ml: 100,
          concentration: 'EDP',
          stock_quantity: 10,
          image_urls: ['https://via.placeholder.com/300x300?text=Chanel+No+5'],
          status: 'published',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          seller_id: 1,
          name_ar: 'ديور سوفاج',
          name_en: 'Dior Sauvage',
          description_ar: 'عطر خشبي حار',
          description_en: 'Woody spicy fragrance',
          product_type: 'eau_de_toilette',
          brand: 'Dior',
          category: 'woody',
          base_price: 120.00,
          size_ml: 100,
          concentration: 'EDT',
          stock_quantity: 15,
          image_urls: ['https://via.placeholder.com/300x300?text=Dior+Sauvage'],
          status: 'published',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
        {
          id: 3,
          seller_id: 2,
          name_ar: 'توم فورد أود وود',
          name_en: 'Tom Ford Oud Wood',
          description_ar: 'عطر شرقي فاخر',
          description_en: 'Luxurious oriental scent',
          product_type: 'eau_de_parfum',
          brand: 'Tom Ford',
          category: 'oriental',
          base_price: 280.00,
          size_ml: 50,
          concentration: 'EDP',
          stock_quantity: 8,
          image_urls: ['https://via.placeholder.com/300x300?text=Tom+Ford+Oud'],
          status: 'published',
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
        },
        {
          id: 4,
          seller_id: 2,
          name_ar: 'كريد أفينتوس',
          name_en: 'Creed Aventus',
          description_ar: 'عطر فواكه منعش',
          description_en: 'Fresh fruity fragrance',
          product_type: 'eau_de_parfum',
          brand: 'Creed',
          category: 'fruity',
          base_price: 350.00,
          size_ml: 100,
          concentration: 'EDP',
          stock_quantity: 5,
          image_urls: ['https://via.placeholder.com/300x300?text=Creed+Aventus'],
          status: 'published',
          created_at: '2024-01-04T00:00:00Z',
          updated_at: '2024-01-04T00:00:00Z',
        },
      ];

      setFavorites(mockFavorites);
      setLoading(false);
    };

    fetchFavorites();
  }, []);

  const handleRemoveFavorite = (productId: number) => {
    setFavorites(favorites.filter(p => p.id !== productId));
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-luxury p-6 shadow-luxury">
      <h1 className="text-h2 text-charcoal mb-6">{t('account.favorites')}</h1>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
