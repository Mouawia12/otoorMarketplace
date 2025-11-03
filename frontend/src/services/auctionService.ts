import { Auction, Bid, Product } from '../types';

const mockAuctions: (Auction & { product: Product; seller?: { id: number; full_name: string; verified_seller: boolean } })[] = [
  {
    id: 1,
    product_id: 1,
    seller_id: 1,
    starting_price: 100.00,
    current_price: 142.00,
    minimum_increment: 5.00,
    start_time: new Date(Date.now() - 86400000).toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    status: 'active',
    total_bids: 8,
    seller: {
      id: 1,
      full_name: 'Ahmed Al-Rashid',
      verified_seller: true
    },
    product: {
      id: 1,
      seller_id: 1,
      name_ar: 'شانيل رقم 5',
      name_en: 'Chanel No 5',
      description_ar: 'عطر كلاسيكي فاخر مع نفحات من الياسمين والورد',
      description_en: 'Classic luxury perfume with jasmine and rose notes',
      product_type: 'eau_de_parfum',
      brand: 'Chanel',
      category: 'floral',
      base_price: 150.00,
      size_ml: 100,
      concentration: 'EDP',
      condition: 'new',
      stock_quantity: 1,
      image_urls: [
        'https://via.placeholder.com/600x600?text=Chanel+No+5+Main',
        'https://via.placeholder.com/600x600?text=Chanel+No+5+Side',
        'https://via.placeholder.com/600x600?text=Chanel+No+5+Back',
        'https://via.placeholder.com/600x600?text=Chanel+No+5+Detail',
      ],
      status: 'published',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
];

const mockBids: Bid[] = [
  { id: 1, auction_id: 1, bidder_id: 2, amount: 105.00, created_at: new Date(Date.now() - 7200000).toISOString(), bidder: { id: 2, email: 'user2@test.com', full_name: 'Ali***', roles: ['buyer'], status: 'active' } },
  { id: 2, auction_id: 1, bidder_id: 3, amount: 110.00, created_at: new Date(Date.now() - 6800000).toISOString(), bidder: { id: 3, email: 'user3@test.com', full_name: 'Sar***', roles: ['buyer'], status: 'active' } },
  { id: 3, auction_id: 1, bidder_id: 2, amount: 115.00, created_at: new Date(Date.now() - 6400000).toISOString(), bidder: { id: 2, email: 'user2@test.com', full_name: 'Ali***', roles: ['buyer'], status: 'active' } },
  { id: 4, auction_id: 1, bidder_id: 4, amount: 120.00, created_at: new Date(Date.now() - 5200000).toISOString(), bidder: { id: 4, email: 'user4@test.com', full_name: 'Fah***', roles: ['buyer'], status: 'active' } },
  { id: 5, auction_id: 1, bidder_id: 3, amount: 125.00, created_at: new Date(Date.now() - 4800000).toISOString(), bidder: { id: 3, email: 'user3@test.com', full_name: 'Sar***', roles: ['buyer'], status: 'active' } },
  { id: 6, auction_id: 1, bidder_id: 2, amount: 130.00, created_at: new Date(Date.now() - 3600000).toISOString(), bidder: { id: 2, email: 'user2@test.com', full_name: 'Ali***', roles: ['buyer'], status: 'active' } },
  { id: 7, auction_id: 1, bidder_id: 5, amount: 137.00, created_at: new Date(Date.now() - 1800000).toISOString(), bidder: { id: 5, email: 'user5@test.com', full_name: 'Moh***', roles: ['buyer'], status: 'active' } },
  { id: 8, auction_id: 1, bidder_id: 4, amount: 142.00, created_at: new Date(Date.now() - 900000).toISOString(), bidder: { id: 4, email: 'user4@test.com', full_name: 'Fah***', roles: ['buyer'], status: 'active' } },
];

export const fetchAuctionById = async (id: number) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const auction = mockAuctions.find(a => a.id === id);
  if (!auction) {
    throw new Error('Auction not found');
  }
  
  return auction;
};

export const fetchAuctionBids = async (auctionId: number) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return mockBids
    .filter(b => b.auction_id === auctionId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const placeBid = async (auctionId: number, amount: number) => {
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const auction = mockAuctions.find(a => a.id === auctionId);
  if (!auction) {
    throw new Error('Auction not found');
  }
  
  if (amount < auction.current_price + auction.minimum_increment) {
    const minBidSAR = ((auction.current_price + auction.minimum_increment) * 3.75).toFixed(2);
    throw new Error(`Bid must be at least ${minBidSAR} ﷼`);
  }
  
  const newBid: Bid = {
    id: mockBids.length + 1,
    auction_id: auctionId,
    bidder_id: 1,
    amount,
    created_at: new Date().toISOString(),
    bidder: { id: 1, email: 'you@test.com', full_name: 'You***', roles: ['buyer'], status: 'active' },
  };
  
  mockBids.push(newBid);
  auction.current_price = amount;
  auction.total_bids = (auction.total_bids || 0) + 1;
  
  return newBid;
};

export const fetchAuctionByProductId = async (productId: number) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const auction = mockAuctions.find(a => a.product_id === productId);
  return auction || null;
};
