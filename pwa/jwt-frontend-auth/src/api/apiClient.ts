import axios from 'axios';
import { getToken } from '../utils/token';

const  api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://localhost',
  headers: {
    'Content-Type': 'application/ld+json',
    'Accept': 'application/ld+json',
  },
  // For development with self-signed certificates
  ...(process.env.NODE_ENV === 'development' && {
    httpsAgent: typeof window === 'undefined' ? require('https').Agent({ rejectUnauthorized: false }) : undefined,
  }),
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Use application/json for auth endpoint
  if (config.url?.includes('/auth')) {
    config.headers['Content-Type'] = 'application/json';
  }
  // Use application/merge-patch+json for PATCH requests
  else if (config.method === 'patch') {
    config.headers['Content-Type'] = 'application/merge-patch+json';
  }
  
  return config;
});

export default api;