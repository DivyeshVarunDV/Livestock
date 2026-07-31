'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: any;
  token: string | null;
  login: (userData: any, token: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    } else {
      const defaultAdmin = {
        id: 'GOV-USR-1001',
        name: 'Dr. Rajeshwar Sharma, DVM',
        email: 'r.sharma.dvo@dahd.gov.in',
        role: 'ADMIN',
        department: 'DAH&D New Delhi'
      };
      setUser(defaultAdmin);
      setToken('gov-demo-token-2026');
      localStorage.setItem('user', JSON.stringify(defaultAdmin));
      localStorage.setItem('token', 'gov-demo-token-2026');
    }
    setLoading(false);
  }, []);

  const login = (userData: any, tokenVal: string) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', tokenVal);
    setUser(userData);
    setToken(tokenVal);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
