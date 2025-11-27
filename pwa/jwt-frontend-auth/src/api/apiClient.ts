import axios from 'axios';
import { getToken } from '../utils/token';

const baseURL = process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== ''
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : '';

const api = axios.create({
  baseURL,
});

api.interceptors.request.use(cfg => {
  const token = getToken();
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
  return cfg;
});

export default api;