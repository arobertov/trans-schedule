import { AuthProvider } from 'react-admin';
import { login as jwtLogin, logout, isAuthenticated, getToken } from '../../jwt-frontend-auth/src/auth/authService';

const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    try {
      const token = await jwtLogin(username, password);
      console.log('Login successful, token:', token?.substring(0, 20) + '...');
      console.log('Token from storage:', getToken()?.substring(0, 20) + '...');
      return Promise.resolve();
    } catch (error) {
      console.log('Login failed:', error);
      return Promise.reject(new Error('Грешно потребителско име или парола'));
    }
  },
  
  logout: () => {
    logout();
    return Promise.resolve();
  },
  
  checkAuth: () => {
    const isAuth = isAuthenticated();
    const token = getToken();
    console.log('checkAuth called:', { isAuth, hasToken: !!token });
    
    // Проверка дали токенът е изтекъл
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Конвертиране от секунди в милисекунди
        if (Date.now() >= exp) {
          console.log('Token expired, logging out');
          logout();
          return Promise.reject(new Error('Сесията изтече, моля влезте отново'));
        }
      } catch (error) {
        console.error('Error parsing token:', error);
        logout();
        return Promise.reject(new Error('Невалиден токен, моля влезте отново'));
      }
    }
    
    return isAuth ? Promise.resolve() : Promise.reject();
  },
  
  checkError: (error: any) => {
    console.log('checkError called:', error);
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