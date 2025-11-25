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
  } | null;
  seller_profile_submitted?: boolean;
  verified_seller?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (idToken: string, role?: 'buyer' | 'seller') => Promise<User>;
  register: (data: { email: string; password: string; full_name: string; phone?: string; roles?: string[] }) => Promise<User>;
  updateProfile: (data: { full_name?: string; phone?: string; avatar_url?: string }) => Promise<User>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });

        const { access_token, user } = response.data;
        localStorage.setItem('auth_token', access_token);
        set({ token: access_token, isAuthenticated: true, user });
        return user;
      },

      loginWithGoogle: async (idToken: string, role?: 'buyer' | 'seller') => {
        const response = await api.post('/auth/google', { idToken, role });
        const { access_token, user } = response.data;
        localStorage.setItem('auth_token', access_token);
        set({ token: access_token, isAuthenticated: true, user });
        return user;
      },

      register: async (data) => {
        const response = await api.post('/auth/register', data);
        const { access_token, user } = response.data;
        localStorage.setItem('auth_token', access_token);
        set({ token: access_token, user, isAuthenticated: true });
        return user;
      },

      updateProfile: async (data) => {
        const response = await api.patch('/auth/me', data);
        const user = response.data;
        set({ user });
        return user;
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        useWishlistStore.getState().clear();
        if (typeof window !== 'undefined') {
          window.location.replace('/');
          return;
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchUser: async () => {
        try {
          const token = localStorage.getItem('auth_token');
          if (!token) {
            set({ user: null, token: null, isAuthenticated: false });
            return;
          }

          const response = await api.get('/auth/me');
          set({ user: response.data, isAuthenticated: true, token: token });
        } catch (error) {
          localStorage.removeItem('auth_token');
          set({ user: null, token: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        const token = state?.token || localStorage.getItem('auth_token');
        if (token) {
          state?.fetchUser?.();
        }
      },
    }
  )
);
