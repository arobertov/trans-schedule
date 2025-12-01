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

export async function register(username: string, password: string) {
  const res = await api.post('/users', { 
    username, 
    plainPassword: password 
  });
  return res.data;
}

export async function updateUser(id: number, username: string, newPassword?: string, oldPassword?: string) {
  const data: any = { username };
  if (newPassword && oldPassword) {
    data.plainPassword = newPassword;
    data.oldPassword = oldPassword;
  }
  const res = await api.patch(`/users/${id}`, data);
  return res.data;
}

export async function getUser(id: number) {
  const res = await api.get(`/users/${id}`);
  return res.data;
}

export function logout() {
  clearToken();
}

export function isAuthenticated() {
  return !!getToken();
}

export { getToken, saveToken, clearToken };