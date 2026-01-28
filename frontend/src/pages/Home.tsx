import { useEffect, useMemo, useState } from 'react';
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
import { Product, Auction } from '../types';
import { fetchActivePromotions, Promotion } from '../services/promotionService';
import { resolveImageUrl } from '../utils/image';
import { PLACEHOLDER_PERFUME } from '../utils/staticAssets';
import FloatingPromotion from '../components/promotions/FloatingPromotion';

export default function Home() {
  const { t } = useTranslation();
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [heroPromotionSlides, setHeroPromotionSlides] = useState<HeroSlide[]>([]);
  const [featuredNew, setFeaturedNew] = useState<Product[]>([]);
  const [featuredUsed, setFeaturedUsed] = useState<Product[]>([]);
  const [liveAuctions, setLiveAuctions] = useState<Auction[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        const [data, heroPromotions] = await Promise.all([
          homeService.getHomeData(),
          fetchActivePromotions(['HERO']),
        ]);

        const promoSlides = heroPromotions
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((promotion) => mapPromotionToHeroSlide(promotion));

        setHeroPromotionSlides(promoSlides);
        setHeroSlides(data.heroSlides);
        setFeaturedNew(data.featuredNew);
        setFeaturedUsed(data.featuredUsed);
        setLiveAuctions(data.liveAuctions);
        setBrands(data.brands);
      } catch (err) {
        console.error('Error loading home data:', err);
        setError(t('common.error'));
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, [t]);

  const combinedHeroSlides = useMemo(() => {
    if (heroPromotionSlides.length) return heroPromotionSlides;
    return heroSlides;
  }, [heroSlides, heroPromotionSlides]);

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
      <Hero slides={combinedHeroSlides} />
      <PromoTiles />
      <AuctionsStrip auctions={liveAuctions} />
      <FeaturedGrid
        title={{ ar: t('home.featuredNew'), en: t('home.featuredNew') }}
        products={featuredNew}
        ctaText={{ ar: t('home.viewAllNew'), en: t('home.viewAllNew') }}
        ctaLink="/new"
        type="new"
        compactDesktop
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
      <FloatingPromotion />
    </div>
  );
}

const mapPromotionToHeroSlide = (promotion: Promotion): HeroSlide => {
  const image =
    resolveImageUrl(promotion.image_url ?? undefined) || PLACEHOLDER_PERFUME;
  const title = {
    ar: promotion.title_ar,
    en: promotion.title_en,
  };
  const subtitle = {
    ar: promotion.subtitle_ar ?? promotion.badge_text_ar ?? '',
    en: promotion.subtitle_en ?? promotion.badge_text_en ?? '',
  };
  const primaryCtaText = {
    ar: promotion.button_text_ar || 'تسوق الآن',
    en: promotion.button_text_en || 'Shop now',
  };
  const secondaryTextAr = promotion.badge_text_ar || promotion.subtitle_ar;
  const secondaryTextEn = promotion.badge_text_en || promotion.subtitle_en;

  return {
    id: `promo-${promotion.id}`,
    image,
    title,
    subtitle,
    primaryCta: {
      text: primaryCtaText,
      link: promotion.link_url || '/products',
    },
    secondaryCta:
      secondaryTextAr || secondaryTextEn
        ? {
            text: {
              ar: secondaryTextAr || primaryCtaText.ar,
              en: secondaryTextEn || primaryCtaText.en,
            },
            link: promotion.link_url || '/products',
          }
        : undefined,
  };
};
