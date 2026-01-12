import axios from 'axios';
import { getResolvedApiBaseUrl } from './runtimeConfig';

const api = axios.create({
  baseURL: getResolvedApiBaseUrl(),
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;
