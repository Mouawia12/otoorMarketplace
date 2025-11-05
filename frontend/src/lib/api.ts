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

export default api;
