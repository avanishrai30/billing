'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { sessionManager } from '../lib/auth/session';
import { apiClient, registerSessionExpiredCallback } from '../lib/api/client';
import { realtimeManager } from '../lib/realtime/socket';
import type { AuthUser, LoginCredentials, LoginResponse } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isStoreAuthorized: (storeId: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  // Restore session from localStorage on cold boot
  useEffect(() => {
    try {
      const storedToken = sessionManager.getToken();
      const storedUser = sessionManager.getUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        realtimeManager.connect();
        if (storedUser.assignedStoreId && storedUser.assignedStoreId !== 'all') {
          realtimeManager.joinStore(storedUser.assignedStoreId);
        }
      }
    } catch (err) {
      console.error('[Auth] Failed to restore session:', err);
      sessionManager.clearSession();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await apiClient.post('/api/v1/auth/logout', {}).catch(() => {});
      }
    } finally {
      sessionManager.clearSession();
      realtimeManager.disconnect();
      setUser(null);
      setToken(null);
      router.push('/login');
    }
  }, [token, router]);

  // Register 401 automatic session expiration hook
  useEffect(() => {
    registerSessionExpiredCallback(() => {
      logout();
    });
  }, [logout]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthUser> => {
    const res = await apiClient.post<LoginResponse>('/api/v1/auth/login', credentials, {
      skipAuth: true
    });

    if (res.success && res.token && res.user) {
      sessionManager.setToken(res.token);
      sessionManager.setUser(res.user);
      setToken(res.token);
      setUser(res.user);

      realtimeManager.connect();
      if (res.user.assignedStoreId && res.user.assignedStoreId !== 'all') {
        realtimeManager.joinStore(res.user.assignedStoreId);
      }

      return res.user;
    }

    throw new Error('Authentication failed: Invalid response from server');
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.category === 'super admin' || user.category === 'owner') return true;
    if (user.permissions?.includes('*')) return true;
    return Boolean(user.permissions?.includes(permission));
  }, [user]);

  const isStoreAuthorized = useCallback((storeId: string): boolean => {
    if (!user) return false;
    if (user.category === 'super admin' || user.category === 'owner' || user.assignedStoreId === 'all') {
      return true;
    }
    if (user.assignedStoreId === storeId) return true;
    return Boolean(user.assignedStores?.includes(storeId));
  }, [user]);

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    login,
    logout,
    hasPermission,
    isStoreAuthorized
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
