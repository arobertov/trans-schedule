import axios from 'axios';
import { getToken } from '../utils/token';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://localhost',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;