import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export interface User {
  id: number;
  email: string;
  full_name: string;
  created_at?: string;
  avatar_url?: string | null;
  roles: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (idToken: string) => Promise<User>;
  register: (data: { email: string; password: string; full_name: string; phone?: string }) => Promise<User>;
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

      loginWithGoogle: async (idToken: string) => {
        const response = await api.post('/auth/google', { idToken });
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

      logout: () => {
        localStorage.removeItem('auth_token');
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
