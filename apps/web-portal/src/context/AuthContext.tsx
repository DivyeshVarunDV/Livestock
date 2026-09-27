'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string; // lower-case: admin | veterinarian | tester | farmer
  permissions: string[];
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: (SessionUser & Record<string, any>) | null;
  token: string | null;
  login: (userData: SessionUser, token: string) => void;
  logout: () => void;
  refresh: () => Promise<void>;
  /** UI hint only; the API enforces permissions on every request. */
  can: (permission: string) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(SessionUser & Record<string, any>) | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const clear = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  }, []);

  const refresh = useCallback(async () => {
    // The server is the authority on role, status and permissions.
    const me = await apiFetch('/auth/me');
    const fresh: SessionUser = {
      id: me.id,
      email: me.email,
      name: me.name,
      role: String(me.role).toLowerCase(),
      permissions: Array.isArray(me.permissions) ? me.permissions : [],
      mustChangePassword: Boolean(me.mustChangePassword),
    };
    localStorage.setItem('user', JSON.stringify(fresh));
    setUser(fresh);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (!storedUser || !storedToken) {
      setLoading(false);
      return;
    }
    try {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    } catch {
      clear();
      setLoading(false);
      return;
    }
    refresh()
      .catch(() => clear())
      .finally(() => setLoading(false));
  }, [clear, refresh]);

  const login = (userData: SessionUser, tokenVal: string) => {
    const normalized = { ...userData, role: String(userData.role).toLowerCase(), permissions: userData.permissions ?? [] };
    localStorage.setItem('user', JSON.stringify(normalized));
    localStorage.setItem('token', tokenVal);
    setUser(normalized);
    setToken(tokenVal);
  };

  const logout = () => {
    // Record the sign-out in the audit trail; never block the UI on it.
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clear();
    router.push('/login');
  };

  const can = (permission: string) => Boolean(user?.permissions?.includes(permission));

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refresh, can, loading }}>
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
