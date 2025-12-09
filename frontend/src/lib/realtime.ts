import { io, type Socket } from 'socket.io-client';
import { getResolvedApiBaseUrl } from './runtimeConfig';
import type { Bid } from '../types';

let socket: Socket | null = null;
let currentAuthToken: string | null = null;

const stripApiSuffix = (baseUrl: string) => baseUrl.replace(/\/api$/i, '');

const resolveRealtimeBase = () => {
  const apiBase = getResolvedApiBaseUrl();
  return stripApiSuffix(apiBase);
};

const refreshSocketAuth = (instance: Socket) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (currentAuthToken !== token) {
    instance.auth = token ? { token } : {};
    currentAuthToken = token;
    if (instance.connected) {
      instance.disconnect();
      instance.connect();
      return;
    }
  }

  if (!instance.connected) {
    instance.connect();
  }
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

  refreshSocketAuth(socket);
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
