import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { fetchProductById, fetchRelatedProducts } from '../services/productService';
import { fetchAuctionByProductId } from '../services/auctionService';
import ProductCard from '../components/products/ProductCard';
import { Product, Auction } from '../types';
import { formatPrice } from '../utils/currency';
import Countdown from '../components/common/Countdown';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useUIStore();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [activeAuction, setActiveAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const loadProduct = async () => {
      if (!id || isNaN(parseInt(id))) {
        setLoading(false);
        setProduct(null);
        return;
      }
      
      setLoading(true);
      try {
        const productData = await fetchProductById(parseInt(id));
        setProduct(productData);
        
        const related = await fetchRelatedProducts(parseInt(id), 4);
        setRelatedProducts(related);
        
        try {
          const auction = await fetchAuctionByProductId(parseInt(id));
          if (auction && auction.status === 'active' && new Date(auction.end_time) > new Date()) {
            setActiveAuction(auction);
          } else {
            setActiveAuction(null);
          }
        } catch (auctionError) {
          setActiveAuction(null);
        }
      } catch (error) {
        console.error('Error loading product:', error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.loading')}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('productDetail.notFound')}</p>
        <button
          onClick={() => navigate('/new')}
          className="mt-4 bg-gold text-charcoal px-6 py-2 rounded-luxury font-semibold hover:bg-gold-hover transition"
        >
          {t('productDetail.backToShop')}
        </button>
      </div>
    );
  }

  const name = language === 'ar' ? product.name_ar : product.name_en;
  const description = language === 'ar' ? product.description_ar : product.description_en;
  const images = product.image_urls || [];
  const isInStock = product.stock_quantity > 0;

  return (
    <div className="space-y-12">
      {/* Active Auction Banner */}
      {activeAuction && (
        <div className="bg-gradient-to-r from-gold to-gold-light rounded-luxury p-6 shadow-luxury">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-charcoal mb-2">{t('auction.activeAuction')}</h3>
              <div className="flex items-center gap-6 text-charcoal">
                <div>
                  <p className="text-sm opacity-80">{t('auction.currentBid')}</p>
                  <p className="text-2xl font-bold">{formatPrice(activeAuction.current_price, language)}</p>
                </div>
                <div>
                  <p className="text-sm opacity-80">{t('auction.totalBids')}</p>
                  <p className="text-xl font-bold">{activeAuction.total_bids || 0}</p>
                </div>
                <div>
                  <p className="text-sm opacity-80">{t('auction.timeRemaining')}</p>
                  <Countdown 
                    endAt={activeAuction.end_time} 
                    compact 
                    className="text-xl font-bold text-charcoal"
                  />
                </div>
              </div>
            </div>
            <Link
              to={`/auction/${activeAuction.id}`}
              className="bg-charcoal text-ivory px-8 py-3 rounded-luxury font-semibold hover:bg-charcoal-light transition whitespace-nowrap"
            >
              {t('auction.goToAuction')}
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="bg-ivory rounded-luxury overflow-hidden aspect-square">
            <img
              src={images[selectedImage] || '/images/placeholder-perfume.svg'}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/images/placeholder-perfume.svg';
              }}
            />
          </div>
          
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-luxury overflow-hidden border-2 transition ${
                    selectedImage === index ? 'border-gold' : 'border-transparent'
                  }`}
                >
                  <img
                    src={img || '/images/placeholder-perfume.svg'}
                    alt={`${name} ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/images/placeholder-perfume.svg';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <p className="text-taupe text-sm mb-2">{product.brand}</p>
            <h1 className="text-h1 text-charcoal mb-4">{name}</h1>
            <p className="text-charcoal-light leading-relaxed">{description}</p>
          </div>

          <div className="border-t border-b border-gray-200 py-6 space-y-3">
            <div className="flex justify-between">
              <span className="text-taupe">{t('productDetail.size')}</span>
              <span className="text-charcoal font-semibold">{product.size_ml}ml</span>
            </div>
            <div className="flex justify-between">
              <span className="text-taupe">{t('productDetail.concentration')}</span>
              <span className="text-charcoal font-semibold">{product.concentration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-taupe">{t('productDetail.category')}</span>
              <span className="text-charcoal font-semibold">{product.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-taupe">{t('productDetail.stock')}</span>
              <span className={`font-semibold ${isInStock ? 'text-success' : 'text-alert'}`}>
                {isInStock ? `${product.stock_quantity} ${t('productDetail.available')}` : t('products.outOfStock')}
              </span>
            </div>
          </div>

          <div className="bg-sand rounded-luxury p-6">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold text-gold">{formatPrice(product.base_price, language)}</span>
            </div>

            <div className="space-y-3">
              <button
                disabled={!isInStock}
                className="w-full bg-gold text-charcoal px-6 py-3 rounded-luxury font-semibold hover:bg-gold-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInStock ? t('productDetail.buyNow') : t('products.outOfStock')}
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-charcoal text-ivory px-4 py-2 rounded-luxury font-semibold hover:bg-charcoal-light transition">
                  {t('productDetail.requestAuth')}
                </button>
                <button className="bg-white border-2 border-charcoal text-charcoal px-4 py-2 rounded-luxury font-semibold hover:bg-ivory transition">
                  {t('productDetail.addFavorite')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-gray-200 pt-12">
          <h2 className="text-h2 text-charcoal mb-6">{t('productDetail.relatedProducts')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} type="new" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
