import { io, type Socket } from 'socket.io-client';
import { getResolvedApiBaseUrl } from './runtimeConfig';
import type { Bid } from '../types';

let socket: Socket | null = null;
let currentAuthToken: string | null = null;

const stripApiSuffix = (baseUrl: string) => baseUrl.replace(/\/api$/i, '');

const getSocketBaseUrl = () => {
  const apiBase = getResolvedApiBaseUrl();
  // primary: direct host without /api (e.g. https://api.fragraworld.com)
  const derived = stripApiSuffix(apiBase);
  // allow explicit override if needed later
  const raw =
    typeof import.meta !== 'undefined'
      ? (import.meta.env?.VITE_SOCKET_BASE_URL as unknown)
      : undefined;
  const explicit = typeof raw === 'string' ? raw.trim() : undefined;
  return explicit && explicit.length > 0 ? explicit : derived;
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
    socket = io(getSocketBaseUrl(), {
      path: '/api/socket.io',
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
