import axios from 'axios';

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, '');

const getDefaultBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (import.meta.env.DEV) {
      return 'http://localhost:8080/api';
    }

    return `${window.location.origin}/api`;
  }

  return 'http://localhost:8080/api';
};

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: normalizeBaseUrl(configuredBaseUrl ? normalizeBaseUrl(configuredBaseUrl) : getDefaultBaseUrl()),
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
