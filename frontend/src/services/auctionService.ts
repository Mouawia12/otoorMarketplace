import api from '../lib/api';
import { Auction, Bid } from '../types';

export const fetchAuctions = async (): Promise<Auction[]> => {
  const response = await api.get('/auctions');
  return response.data.auctions;
};

export const fetchAuctionById = async (id: number): Promise<Auction> => {
  const response = await api.get(`/auctions/${id}`);
  return response.data;
};

export const fetchAuctionBids = async (auctionId: number): Promise<Bid[]> => {
  const response = await api.get(`/auctions/${auctionId}/bids`);
  return response.data.bids;
};

export const placeBid = async (auctionId: number, amount: number): Promise<Bid> => {
  const response = await api.post(`/auctions/${auctionId}/bids`, { amount });
  return response.data;
};

export const fetchAuctionByProductId = async (productId: number): Promise<Auction | null> => {
  const response = await api.get(`/auctions/product/${productId}`);
  return response.data.auction;
};
