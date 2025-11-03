import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import homeService, { HeroSlide, Brand } from '../services/homeService';
import Hero from './home/HomeSections/Hero';
import PromoTiles from './home/HomeSections/PromoTiles';
import FeaturedGrid from './home/HomeSections/FeaturedGrid';
import AuctionsStrip from './home/HomeSections/AuctionsStrip';
import TrustBadges from './home/HomeSections/TrustBadges';
import BrandsCarousel from './home/HomeSections/BrandsCarousel';
import Editorial from './home/HomeSections/Editorial';
import Newsletter from './home/HomeSections/Newsletter';
import Testimonials from './home/HomeSections/Testimonials';

export default function Home() {
  const { t } = useTranslation();
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [featuredNew, setFeaturedNew] = useState<any[]>([]);
  const [featuredUsed, setFeaturedUsed] = useState<any[]>([]);
  const [liveAuctions, setLiveAuctions] = useState<any[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        const [slides, newProducts, usedProducts, auctions, brandList] = await Promise.all([
          homeService.getHeroSlides(),
          homeService.getFeaturedNew(),
          homeService.getFeaturedUsed(),
          homeService.getLiveAuctions(),
          homeService.getTopBrands()
        ]);

        setHeroSlides(slides);
        setFeaturedNew(newProducts);
        setFeaturedUsed(usedProducts);
        setLiveAuctions(auctions);
        setBrands(brandList);
      } catch (err) {
        console.error('Error loading home data:', err);
        setError(t('common.error'));
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-taupe">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gold text-charcoal px-6 py-2 rounded-lg font-semibold hover:bg-gold-light transition"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <Hero slides={heroSlides} />
      <PromoTiles />
      <AuctionsStrip auctions={liveAuctions} />
      <FeaturedGrid
        title={{ ar: t('home.featuredNew'), en: t('home.featuredNew') }}
        products={featuredNew}
        ctaText={{ ar: t('home.viewAllNew'), en: t('home.viewAllNew') }}
        ctaLink="/new"
        type="new"
      />
      <FeaturedGrid
        title={{ ar: t('home.editorsPicks'), en: t('home.editorsPicks') }}
        products={featuredUsed}
        ctaText={{ ar: t('home.viewAllUsed'), en: t('home.viewAllUsed') }}
        ctaLink="/used"
        type="used"
      />
      <Testimonials />
      <BrandsCarousel brands={brands} />
      <Editorial />
      <Newsletter />
      <TrustBadges />
    </div>
  );
}
