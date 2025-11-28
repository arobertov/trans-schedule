import api from '../api/apiClient';
import { saveToken, clearToken, getToken } from '../utils/token';

export async function login(username: string, password: string) {
  const path = process.env.NEXT_PUBLIC_LOGIN_PATH || '/auth';
  const res = await api.post(path, { username, password });
  const token = res.data.token ?? res.data.access_token ?? null;
  if (!token) throw new Error('No token in response');
  saveToken(token);
  return token;
}

export function logout() {
  clearToken();
}

export function isAuthenticated() {
  return !!getToken();
}

  export { getToken, saveToken, clearToken };