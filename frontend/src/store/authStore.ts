import { create } from 'zustand';
import api from '../lib/api';

interface User {
  id: number;
  email: string;
  full_name: string;
  roles: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; phone?: string }) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('auth_token'),
  isAuthenticated: !!localStorage.getItem('auth_token'),

  login: async (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    const { access_token } = response.data;
    localStorage.setItem('auth_token', access_token);
    set({ token: access_token, isAuthenticated: true });

    const userResponse = await api.get('/auth/me');
    set({ user: userResponse.data });
  },

  register: async (data) => {
    await api.post('/auth/register', data);
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data, isAuthenticated: true });
    } catch (error) {
      set({ user: null, token: null, isAuthenticated: false });
      localStorage.removeItem('auth_token');
    }
  }
}));
