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
  allowedPages: string[];
  login: (token: string, userData: User) => void;
  logout: () => void;
  refreshPermissions: () => Promise<void>;
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

  const [allowedPages, setAllowedPages] = useState<string[]>([]);

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

  const refreshPermissions = async () => {
    if (!user) return;
    
    // System admin has full access by default. 
    // We could return '*' or all paths, but we can also just let the UI handle SYSTEM_ADMINISTRATOR uniquely.
    if (user.role === 'SYSTEM_ADMINISTRATOR') {
      setAllowedPages(['*']);
      return;
    }

    try {
      const res = await fetch(`http://localhost:3030/api/users/permissions/${user.role}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const allowed = json.data.filter((p: any) => p.canAccess).map((p: any) => p.pagePath);
          setAllowedPages(allowed);
        }
      }
    } catch (e) {
      console.error('Failed to fetch permissions', e);
    }
  };

  useEffect(() => {
    // If invalid session data is detected, clean it up
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user_data');
    if ((token && !storedUser) || (!token && storedUser)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      refreshPermissions();
    }
  }, [isAuthenticated, user?.role]);

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
    setAllowedPages([]);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, allowedPages, login, logout, refreshPermissions }}>
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
