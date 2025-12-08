import { io, type Socket } from 'socket.io-client';
import { getResolvedApiBaseUrl } from './runtimeConfig';
import type { Bid } from '../types';

let socket: Socket | null = null;

const stripApiSuffix = (baseUrl: string) => baseUrl.replace(/\/api$/i, '');

const resolveRealtimeBase = () => {
  const apiBase = getResolvedApiBaseUrl();
  return stripApiSuffix(apiBase);
};

const ensureSocket = () => {
  if (!socket) {
    socket = io(resolveRealtimeBase(), {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  socket.auth = token ? { token } : {};

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export type AuctionRealtimePayload = {
  auctionId: number;
  bid: Bid;
  currentPrice: number;
  totalBids: number;
  placedAt: string;
};

export const getAuctionRealtimeSocket = () => ensureSocket();
