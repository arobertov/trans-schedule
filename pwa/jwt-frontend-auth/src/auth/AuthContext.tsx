import React, { createContext, useContext, useState, useEffect } from 'react';
import { getToken, saveToken, clearToken } from '../utils/token';
import { AuthResponse, User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        // Decode token to get user information (assuming token contains user info)
        const userData: User = JSON.parse(atob(token.split('.')[1]));
        setUser(userData);
      } catch (e) {
        console.error('Failed to decode token:', e);
        clearToken();
      }
    }
  }, []);

  const login = (token: string) => {
    saveToken(token);
    try {
      const userData: User = JSON.parse(atob(token.split('.')[1]));
      setUser(userData);
    } catch (e) {
      console.error('Failed to decode token:', e);
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};