import { io, type Socket } from 'socket.io-client';
import { getResolvedApiBaseUrl } from './runtimeConfig';
import type { Bid } from '../types';

let socket: Socket | null = null;
let currentAuthToken: string | null = null;

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const stripApiSuffix = (baseUrl: string) => baseUrl.replace(/\/api$/i, '');

const getSocketBaseUrl = () => {
  const rawEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta.env?.VITE_SOCKET_BASE_URL as unknown)
      : undefined;
  const explicit =
    typeof rawEnv === 'string' && rawEnv.trim().length > 0
      ? stripTrailingSlash(rawEnv.trim())
      : null;

  if (explicit) {
    return explicit;
  }

  // fallback for local/dev: derive from API base without the /api suffix
  const apiBase = getResolvedApiBaseUrl();
  return stripTrailingSlash(stripApiSuffix(apiBase));
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
      transports: ['polling'], // force polling for diagnostics
      autoConnect: false,
    });

    const instance = socket;

    instance.on('connect', () => {
      console.log('[socket] connected', instance.id);
    });

    instance.on('connect_error', (err) => {
      console.error('[socket] connect_error', {
        message: err.message,
        description: (err as any)?.description,
        context: (err as any)?.context,
        data: (err as any)?.data,
      });
    });

    instance.on('error', (err) => {
      console.error('[socket] error', err);
    });

    instance.io.on('reconnect_error', (err) => {
      console.error('[socket] reconnect_error', err);
    });

    instance.io.on('reconnect_failed', () => {
      console.error('[socket] reconnect_failed');
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
