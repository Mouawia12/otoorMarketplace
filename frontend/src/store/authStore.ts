import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (idToken: string, role?: 'buyer' | 'seller') => Promise<User>;
  register: (data: { email: string; password: string; fullName: string; phone?: string; roles?: string[] }) => Promise<User>;
  updateProfile: (data: { full_name?: string; phone?: string; avatar_url?: string }) => Promise<User>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });

        const { user } = response.data;
        set({ isAuthenticated: true, user });
        return user;
      },

      loginWithGoogle: async (idToken: string, role?: 'buyer' | 'seller') => {
        const response = await api.post('/auth/google', { idToken, role });
        const { user } = response.data;
        set({ isAuthenticated: true, user });
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
        const { user } = response.data;
        set({ user, isAuthenticated: true });
        return user;
      },

      updateProfile: async (data) => {
        const response = await api.patch('/auth/me', data);
        const user = response.data;
        set({ user });
        return user;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
        useAuthStore.persist.clearStorage();
        useWishlistStore.getState().clear();
        useWishlistStore.persist.clearStorage();
        void api.post('/auth/logout', undefined, { timeout: 5000 }).catch(() => null);
        if (typeof window !== 'undefined') {
          window.location.assign('/');
        }
      },

      fetchUser: async () => {
        try {
          const response = await api.get('/auth/me');
          set({ user: response.data, isAuthenticated: true });
        } catch (_error) {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.fetchUser?.();
      },
    }
  )
);
