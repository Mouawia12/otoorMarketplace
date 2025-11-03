import { Product } from '../types';

// Mock product data
const mockProducts: Product[] = [
  {
    id: 1,
    seller_id: 1,
    name_ar: 'شانيل رقم 5',
    name_en: 'Chanel No 5',
    description_ar: 'عطر كلاسيكي فاخر مع نفحات من الياسمين والورد والفانيليا',
    description_en: 'Classic luxury perfume with jasmine, rose and vanilla notes',
    product_type: 'eau_de_parfum',
    brand: 'Chanel',
    category: 'floral',
    base_price: 150.00,
    size_ml: 100,
    concentration: 'EDP',
    condition: 'new',
    stock_quantity: 10,
    image_urls: [
      'https://via.placeholder.com/600x600?text=Chanel+No+5+Main',
      'https://via.placeholder.com/600x600?text=Chanel+No+5+Side',
      'https://via.placeholder.com/600x600?text=Chanel+No+5+Back',
      'https://via.placeholder.com/600x600?text=Chanel+No+5+Detail'
    ],
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
    condition: 'new',
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
    condition: 'used',
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
    category: 'fresh',
    base_price: 350.00,
    size_ml: 100,
    concentration: 'EDP',
    condition: 'new',
    stock_quantity: 5,
    image_urls: ['https://via.placeholder.com/300x300?text=Creed+Aventus'],
    status: 'published',
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
  },
  {
    id: 5,
    seller_id: 1,
    name_ar: 'جو مالون ليمون باسل',
    name_en: 'Jo Malone Lime Basil',
    description_ar: 'عطر حمضي منعش',
    description_en: 'Fresh citrus scent',
    product_type: 'eau_de_cologne',
    brand: 'Jo Malone',
    category: 'citrus',
    base_price: 95.00,
    size_ml: 100,
    concentration: 'EDC',
    condition: 'new',
    stock_quantity: 20,
    image_urls: ['https://via.placeholder.com/300x300?text=Jo+Malone'],
    status: 'published',
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },
  {
    id: 6,
    seller_id: 3,
    name_ar: 'فيرساتشي إيروس',
    name_en: 'Versace Eros',
    description_ar: 'عطر حار منعش',
    description_en: 'Fresh spicy fragrance',
    product_type: 'eau_de_toilette',
    brand: 'Versace',
    category: 'fresh',
    base_price: 85.00,
    size_ml: 100,
    concentration: 'EDT',
    condition: 'used',
    stock_quantity: 12,
    image_urls: ['https://via.placeholder.com/300x300?text=Versace+Eros'],
    status: 'published',
    created_at: '2024-01-06T00:00:00Z',
    updated_at: '2024-01-06T00:00:00Z',
  },
];

interface FetchProductsParams {
  type?: string;
  brand?: string;
  category?: string;
  condition?: string;
  sort?: string;
  page?: number;
  page_size?: number;
  search?: string;
  min_price?: number;
  max_price?: number;
}

export const fetchProductById = async (id: number) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const product = mockProducts.find(p => p.id === id);
  if (!product) {
    throw new Error('Product not found');
  }
  
  return product;
};

export const fetchRelatedProducts = async (productId: number, limit: number = 4) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const product = mockProducts.find(p => p.id === productId);
  if (!product) {
    return [];
  }
  
  return mockProducts
    .filter(p => p.id !== productId && (p.category === product.category || p.brand === product.brand))
    .slice(0, limit);
};

export const fetchProducts = async (params: FetchProductsParams = {}) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  let filtered = [...mockProducts];

  // Filter by search
  if (params.search) {
    const searchLower = params.search.toLowerCase();
    filtered = filtered.filter(p =>
      p.name_en.toLowerCase().includes(searchLower) ||
      p.name_ar.includes(params.search!) ||
      p.brand.toLowerCase().includes(searchLower)
    );
  }

  // Filter by brand
  if (params.brand) {
    filtered = filtered.filter(p => p.brand === params.brand);
  }

  // Filter by category
  if (params.category) {
    filtered = filtered.filter(p => p.category === params.category);
  }

  // Filter by price range
  if (params.min_price !== undefined) {
    filtered = filtered.filter(p => p.base_price >= params.min_price!);
  }
  if (params.max_price !== undefined) {
    filtered = filtered.filter(p => p.base_price <= params.max_price!);
  }

  // Sort
  if (params.sort === 'price_asc') {
    filtered.sort((a, b) => a.base_price - b.base_price);
  } else if (params.sort === 'price_desc') {
    filtered.sort((a, b) => b.base_price - a.base_price);
  } else if (params.sort === 'popularity') {
    // Random for now
    filtered.sort(() => Math.random() - 0.5);
  } else {
    // Default: newest first
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Pagination
  const page = params.page || 1;
  const pageSize = params.page_size || 12;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginated = filtered.slice(start, end);

  return {
    products: paginated,
    total: filtered.length,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(filtered.length / pageSize),
  };
};
