import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user_data');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user_data');
    if (token && storedUser) {
      try {
        JSON.parse(storedUser); // just to verify it's valid JSON
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    // If invalid session data is detected, clean it up
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user_data');
    if ((token && !storedUser) || (!token && storedUser)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
