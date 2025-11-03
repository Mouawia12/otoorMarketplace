export interface HeroSlide {
  id: number;
  image: string;
  title: { ar: string; en: string };
  subtitle: { ar: string; en: string };
  primaryCta: { text: { ar: string; en: string }; link: string };
  secondaryCta?: { text: { ar: string; en: string }; link: string };
}

export interface Category {
  id: number;
  name: { ar: string; en: string };
  slug: string;
}

export interface Brand {
  id: number;
  name: string;
  logo: string;
}

class HomeService {
  async getHeroSlides(): Promise<HeroSlide[]> {
    return [
      {
        id: 1,
        image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1920&q=80',
        title: { ar: 'اكتشف عالم العطور الفاخرة', en: 'Discover Luxury Perfumes' },
        subtitle: { ar: 'عطور أصلية 100% من أرقى البيوتات العالمية', en: '100% Authentic Fragrances from Top Houses' },
        primaryCta: { text: { ar: 'تسوق الآن', en: 'Shop Now' }, link: '/products' },
        secondaryCta: { text: { ar: 'المزادات الحية', en: 'Live Auctions' }, link: '/auctions' }
      },
      {
        id: 2,
        image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=1920&q=80',
        title: { ar: 'مزادات حية على عطور نادرة', en: 'Live Auctions on Rare Fragrances' },
        subtitle: { ar: 'شارك في المزادات واربح عطورك المفضلة بأفضل الأسعار', en: 'Bid and Win Your Favorite Scents at Best Prices' },
        primaryCta: { text: { ar: 'شاهد المزادات', en: 'View Auctions' }, link: '/auctions' },
        secondaryCta: { text: { ar: 'كيف تزايد', en: 'How to Bid' }, link: '/help' }
      },
      {
        id: 3,
        image: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=1920&q=80',
        title: { ar: 'عطور مستعملة معتمدة', en: 'Certified Pre-Owned Perfumes' },
        subtitle: { ar: 'عطور فاخرة مستعملة بحالة ممتازة وأسعار لا تقاوم', en: 'Premium Pre-Owned Fragrances in Excellent Condition' },
        primaryCta: { text: { ar: 'تصفح المستعمل', en: 'Browse Pre-Owned' }, link: '/used' },
        secondaryCta: { text: { ar: 'دليل الشراء', en: 'Buying Guide' }, link: '/help' }
      }
    ];
  }

  async getFeaturedNew(): Promise<any[]> {
    const baseProducts = [
      { id: 1, name: { ar: 'توم فورد عود وود', en: 'Tom Ford Oud Wood' }, brand: 'Tom Ford', price_usd: 350, image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&q=80', rating: 4.8, reviews: 156 },
      { id: 2, name: { ar: 'كريد أفينتوس', en: 'Creed Aventus' }, brand: 'Creed', price_usd: 435, image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&q=80', rating: 4.9, reviews: 203 },
      { id: 3, name: { ar: 'ديور سوفاج', en: 'Dior Sauvage' }, brand: 'Dior', price_usd: 140, image: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80', rating: 4.7, reviews: 421 },
      { id: 4, name: { ar: 'شانيل بلو دو شانيل', en: 'Chanel Bleu de Chanel' }, brand: 'Chanel', price_usd: 150, image: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=600&q=80', rating: 4.8, reviews: 312 },
      { id: 5, name: { ar: 'يوم سان لوران واي', en: 'YSL Y Eau de Parfum' }, brand: 'YSL', price_usd: 120, image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&q=80', rating: 4.6, reviews: 189 },
      { id: 6, name: { ar: 'جورجيو أرماني أكوا دي جيو', en: 'Armani Acqua di Gio' }, brand: 'Armani', price_usd: 110, image: 'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600&q=80', rating: 4.7, reviews: 267 },
      { id: 7, name: { ar: 'برادا لونا روسا', en: 'Prada Luna Rossa' }, brand: 'Prada', price_usd: 130, image: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&q=80', rating: 4.5, reviews: 145 },
      { id: 8, name: { ar: 'فرزاتشي إيروس', en: 'Versace Eros' }, brand: 'Versace', price_usd: 95, image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&q=80', rating: 4.6, reviews: 198 }
    ];
    return baseProducts;
  }

  async getFeaturedUsed(): Promise<any[]> {
    const baseProducts = [
      { id: 101, name: { ar: 'توم فورد توباكو فانيل', en: 'Tom Ford Tobacco Vanille' }, brand: 'Tom Ford', price_usd: 220, original_price_usd: 310, image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&q=80', condition: 'Like New', fill_level: '95%' },
      { id: 102, name: { ar: 'كريد سيلفر ماونتن', en: 'Creed Silver Mountain Water' }, brand: 'Creed', price_usd: 280, original_price_usd: 395, image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&q=80', condition: 'Excellent', fill_level: '90%' },
      { id: 103, name: { ar: 'لو لابو سانتال 33', en: 'Le Labo Santal 33' }, brand: 'Le Labo', price_usd: 180, original_price_usd: 260, image: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80', condition: 'Very Good', fill_level: '85%' },
      { id: 104, name: { ar: 'بيريدو غيبسي ووتر', en: 'Byredo Gypsy Water' }, brand: 'Byredo', price_usd: 150, original_price_usd: 220, image: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=600&q=80', condition: 'Excellent', fill_level: '92%' },
      { id: 105, name: { ar: 'مايزون فرانسيس باكارات 540', en: 'MFK Baccarat Rouge 540' }, brand: 'MFK', price_usd: 230, original_price_usd: 325, image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&q=80', condition: 'Like New', fill_level: '98%' },
      { id: 106, name: { ar: 'أميواج انترلود مان', en: 'Amouage Interlude Man' }, brand: 'Amouage', price_usd: 200, original_price_usd: 300, image: 'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600&q=80', condition: 'Very Good', fill_level: '88%' },
      { id: 107, name: { ar: 'نيشان هاكود', en: 'Nishane Hacivat' }, brand: 'Nishane', price_usd: 140, original_price_usd: 195, image: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&q=80', condition: 'Excellent', fill_level: '93%' },
      { id: 108, name: { ar: 'بارفومز دو مارلي لايتون', en: 'PDM Layton' }, brand: 'PDM', price_usd: 190, original_price_usd: 275, image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&q=80', condition: 'Like New', fill_level: '96%' }
    ];
    return baseProducts;
  }

  async getLiveAuctions(): Promise<any[]> {
    const now = Date.now();
    return [
      { id: 201, product_name: { ar: 'كريد أفينتوس', en: 'Creed Aventus' }, current_bid_usd: 320, bids_count: 12, end_time: new Date(now + 3600000 * 2).toISOString(), image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=80' },
      { id: 202, product_name: { ar: 'توم فورد لوست شيري', en: 'Tom Ford Lost Cherry' }, current_bid_usd: 280, bids_count: 8, end_time: new Date(now + 3600000 * 5).toISOString(), image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&q=80' },
      { id: 203, product_name: { ar: 'رويا دوف كولونيا', en: 'Roja Dove Elysium' }, current_bid_usd: 410, bids_count: 15, end_time: new Date(now + 3600000 * 8).toISOString(), image: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&q=80' },
      { id: 204, product_name: { ar: 'كريد رويال عود', en: 'Creed Royal Oud' }, current_bid_usd: 290, bids_count: 10, end_time: new Date(now + 3600000 * 12).toISOString(), image: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=400&q=80' },
      { id: 205, name: { ar: 'بوند نمبر 9', en: 'Bond No. 9 Dubai' }, current_bid_usd: 195, bids_count: 6, end_time: new Date(now + 3600000 * 18).toISOString(), image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&q=80' }
    ];
  }

  async getTopBrands(): Promise<Brand[]> {
    return [
      { id: 1, name: 'Tom Ford', logo: 'https://logo.clearbit.com/tomford.com' },
      { id: 2, name: 'Creed', logo: 'https://logo.clearbit.com/creedfragrances.com' },
      { id: 3, name: 'Dior', logo: 'https://logo.clearbit.com/dior.com' },
      { id: 4, name: 'Chanel', logo: 'https://logo.clearbit.com/chanel.com' },
      { id: 5, name: 'YSL', logo: 'https://logo.clearbit.com/ysl.com' },
      { id: 6, name: 'Armani', logo: 'https://logo.clearbit.com/armani.com' },
      { id: 7, name: 'Prada', logo: 'https://logo.clearbit.com/prada.com' },
      { id: 8, name: 'Versace', logo: 'https://logo.clearbit.com/versace.com' },
      { id: 9, name: 'Le Labo', logo: 'https://logo.clearbit.com/lelabofragrances.com' },
      { id: 10, name: 'Byredo', logo: 'https://logo.clearbit.com/byredo.com' },
      { id: 11, name: 'MFK', logo: 'https://logo.clearbit.com/maisonfranciskurkdjian.com' },
      { id: 12, name: 'Amouage', logo: 'https://logo.clearbit.com/amouage.com' }
    ];
  }

  async getCategories(): Promise<Category[]> {
    return [
      { id: 1, name: { ar: 'عود', en: 'Oud' }, slug: 'oud' },
      { id: 2, name: { ar: 'حمضيات', en: 'Citrus' }, slug: 'citrus' },
      { id: 3, name: { ar: 'عنبر', en: 'Amber' }, slug: 'amber' },
      { id: 4, name: { ar: 'خشبي', en: 'Woody' }, slug: 'woody' },
      { id: 5, name: { ar: 'زهري', en: 'Floral' }, slug: 'floral' },
      { id: 6, name: { ar: 'شرقي', en: 'Oriental' }, slug: 'oriental' },
      { id: 7, name: { ar: 'منعش', en: 'Fresh' }, slug: 'fresh' },
      { id: 8, name: { ar: 'حار', en: 'Spicy' }, slug: 'spicy' }
    ];
  }
}

export default new HomeService();
