import axios from 'axios';
import { getToken } from '../utils/token';

const resolveApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_ENTRYPOINT || 'http://php';
};

const  api = axios.create({
  baseURL: resolveApiBaseUrl(),
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