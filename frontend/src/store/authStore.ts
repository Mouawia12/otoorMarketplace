import { create } from 'zustand';
import api from '../lib/api';
import { useWishlistStore } from './wishlistStore';

export interface User {
  id: number;
  email: string;
  full_name: string;
  created_at?: string;
  avatar_url?: string | null;
  phone?: string | null;
  roles: string[];
  seller_status?: string;
  seller_profile_status?: string | null;
  seller_profile?: {
    status?: string;
    full_name?: string;
    phone?: string;
    city?: string;
    address?: string;
    national_id?: string;
    iban?: string;
    bank_name?: string;
    torod_warehouse_id?: string | null;
  } | null;
  seller_profile_submitted?: boolean;
  verified_seller?: boolean;
  email_verified?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  authChecked: boolean;
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (idToken: string, role?: 'buyer' | 'seller') => Promise<User>;
  register: (data: { email: string; password: string; fullName: string; phone?: string; roles?: string[] }) => Promise<{
    user: User | null;
    requiresVerification: boolean;
    email?: string;
  }>;
  verifyEmail: (token: string) => Promise<User>;
  resendVerification: (email: string, redirect?: string) => Promise<void>;
  updateProfile: (data: { full_name?: string; phone?: string; avatar_url?: string }) => Promise<User>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

let initializePromise: Promise<void> | null = null;
let logoutInProgress = false;

const resolveLogoutUrl = () => {
  const baseUrl = api.defaults.baseURL ?? '';
  if (!baseUrl) return '/auth/logout';
  return `${baseUrl.replace(/\/+$/, '')}/auth/logout`;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  authChecked: false,

  initializeAuth: async () => {
    if (initializePromise) {
      return initializePromise;
    }

    initializePromise = (async () => {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('auth');
        }
        await get().fetchUser();
      } finally {
        set({ authChecked: true });
        initializePromise = null;
      }
    })();

    return initializePromise;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });

    const { user } = response.data;
    set({ isAuthenticated: true, user, authChecked: true });
    return user;
  },

  loginWithGoogle: async (idToken: string, role?: 'buyer' | 'seller') => {
    const response = await api.post('/auth/google', { idToken, role });
    const { user } = response.data;
    set({ isAuthenticated: true, user, authChecked: true });
    return user;
  },

  register: async (data) => {
    const payload = {
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.roles ? { roles: data.roles } : {}),
    };
    const response = await api.post('/auth/register', payload);
    const user = response.data?.user ?? null;
    const requiresVerification = Boolean(response.data?.requires_verification) || !user;
    const email = response.data?.email ?? payload.email;
    if (user) {
      set({ user, isAuthenticated: true, authChecked: true });
      return { user, requiresVerification, email };
    }
    set({ user: null, isAuthenticated: false, authChecked: true });
    return { user: null, requiresVerification, email };
  },

  verifyEmail: async (token: string) => {
    const response = await api.post('/auth/verify-email', { token });
    const { user } = response.data;
    set({ user, isAuthenticated: true, authChecked: true });
    return user;
  },

  resendVerification: async (email: string, redirect?: string) => {
    await api.post('/auth/resend-verification', {
      email,
      ...(redirect ? { redirect } : {}),
    });
  },

  updateProfile: async (data) => {
    const response = await api.patch('/auth/me', data);
    const user = response.data;
    set({ user });
    return user;
  },

  logout: () => {
    if (logoutInProgress) return;
    logoutInProgress = true;
    if (typeof window !== 'undefined') {
      window.location.replace('/');
      window.setTimeout(() => {
        logoutInProgress = false;
      }, 3000);
    } else {
      logoutInProgress = false;
    }

    set({ user: null, isAuthenticated: false, authChecked: true });
    useWishlistStore.getState().clear();
    useWishlistStore.persist.clearStorage();

    const logoutUrl = resolveLogoutUrl();
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(logoutUrl);
      } else if (typeof fetch !== 'undefined') {
        void fetch(logoutUrl, { method: 'POST', credentials: 'include', keepalive: true });
      } else {
        void api.post('/auth/logout', undefined, { timeout: 5000 }).catch(() => null);
      }
    } catch (_error) {
      void api.post('/auth/logout', undefined, { timeout: 5000 }).catch(() => null);
    }
  },

  fetchUser: async () => {
    if (logoutInProgress) {
      return;
    }
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data, isAuthenticated: true, authChecked: true });
    } catch (_error) {
      set({ user: null, isAuthenticated: false, authChecked: true });
    }
  },
}));
