import { fetchAuctions } from './auctionService';
import {
  fetchProductFiltersMeta,
  fetchProducts,
  ProductFiltersMeta,
} from './productService';
import { Auction, Product } from '../types';

export interface HeroSlide {
  id: string;
  image: string;
  title: { ar: string; en: string };
  subtitle: { ar: string; en: string };
  primaryCta: { text: { ar: string; en: string }; link: string };
  secondaryCta?: { text: { ar: string; en: string }; link: string };
}

export interface Brand {
  id: number;
  name: string;
  logo?: string | null;
}

export interface HomeData {
  heroSlides: HeroSlide[];
  featuredNew: Product[];
  featuredUsed: Product[];
  liveAuctions: Auction[];
  brands: Brand[];
  filtersMeta: ProductFiltersMeta;
}

const placeholderImage = '/images/placeholder-perfume.jpg';

const buildHeroSlideFromProduct = (product: Product, index: number): HeroSlide => {
  const image = product.image_urls?.[0] ?? placeholderImage;
  return {
    id: `product-${product.id}-${index}`,
    image,
    title: {
      ar: product.name_ar,
      en: product.name_en,
    },
    subtitle: {
      ar: `${product.brand} • ${Math.round(product.base_price)} ر.س`,
      en: `${product.brand} • SAR ${Math.round(product.base_price)}`,
    },
    primaryCta: {
      text: {
        ar: 'تسوق الآن',
        en: 'Shop Now',
      },
      link: `/p/${product.id}`,
    },
    secondaryCta: {
      text: {
        ar: 'جميع العطور',
        en: 'All Perfumes',
      },
      link: '/products',
    },
  };
};

const buildHeroSlideFromAuction = (auction: Auction, index: number): HeroSlide | null => {
  if (!auction.product) return null;
  const product = auction.product;
  const image = product.image_urls?.[0] ?? placeholderImage;
  return {
    id: `auction-${auction.id}-${index}`,
    image,
    title: {
      ar: `${product.name_ar} - مزاد حي`,
      en: `${product.name_en} - Live Auction`,
    },
    subtitle: {
      ar: `السعر الحالي: ${Math.round(auction.current_price)} ر.س`,
      en: `Current bid: SAR ${Math.round(auction.current_price)}`,
    },
    primaryCta: {
      text: {
        ar: 'شارك بالمزاد',
        en: 'Join the auction',
      },
      link: `/auction/${auction.id}`,
    },
    secondaryCta: {
      text: {
        ar: 'عرض جميع المزادات',
        en: 'View all auctions',
      },
      link: '/auctions',
    },
  };
};

class HomeService {
  async getHomeData(): Promise<HomeData> {
    const [newProductsRes, usedProductsRes, auctions, filtersMeta] = await Promise.all([
      fetchProducts({ condition: 'NEW', page_size: 8, sort: 'newest' }),
      fetchProducts({ condition: 'USED', page_size: 8, sort: 'newest' }),
      fetchAuctions(),
      fetchProductFiltersMeta(),
    ]);

    const activeAuctions = auctions
      .filter((auction) => auction.status === 'active' && auction.product)
      .sort(
        (a, b) =>
          new Date(a.end_time).getTime() - new Date(b.end_time).getTime()
      )
      .slice(0, 8);

    const heroSlides: HeroSlide[] = [];
    const primaryProducts = newProductsRes.products.slice(0, 3);

    primaryProducts.forEach((product, index) => {
      heroSlides.push(buildHeroSlideFromProduct(product, index));
    });

    if (activeAuctions.length) {
      const auctionSlide = buildHeroSlideFromAuction(activeAuctions[0], heroSlides.length);
      if (auctionSlide) {
        heroSlides.splice(1, 0, auctionSlide);
      }
    }

    // Ensure at least one slide exists
    if (!heroSlides.length && usedProductsRes.products.length) {
      heroSlides.push(buildHeroSlideFromProduct(usedProductsRes.products[0], 0));
    }

    const brands: Brand[] = (filtersMeta.brands || [])
      .slice(0, 12)
      .map((name, index) => ({
        id: index + 1,
        name,
        logo: null,
      }));

    return {
      heroSlides,
      featuredNew: newProductsRes.products,
      featuredUsed: usedProductsRes.products,
      liveAuctions: activeAuctions,
      brands,
      filtersMeta,
    };
  }
}

export default new HomeService();
