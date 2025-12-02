import { AuthProvider } from 'react-admin';
import { login as jwtLogin, logout, isAuthenticated, getToken } from '../../jwt-frontend-auth/src/auth/authService';

const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    try {
      await jwtLogin(username, password);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(new Error('Грешно потребителско име или парола'));
    }
  },
  
  logout: () => {
    logout();
    return Promise.resolve();
  },
  
  checkAuth: () => {
    return isAuthenticated() ? Promise.resolve() : Promise.reject();
  },
  
  checkError: (error: any) => {
    const status = error.status;
    if (status === 401 || status === 403) {
      logout();
      return Promise.reject();
    }
    return Promise.resolve();
  },
  
  getIdentity: () => {
    const token = getToken();
    if (!token) return Promise.reject();
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Promise.resolve({
        id: payload.username || payload.sub,
        fullName: payload.username || 'Admin User',
      });
    } catch {
      return Promise.reject();
    }
  },
  
  getPermissions: () => Promise.resolve(),
};

export default authProvider;