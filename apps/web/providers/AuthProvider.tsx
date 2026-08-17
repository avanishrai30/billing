'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { sessionManager } from '../lib/auth/session';
import { apiClient, registerSessionExpiredCallback } from '../lib/api/client';
import { realtimeManager } from '../lib/realtime/socket';
import type { AuthUser, AuthLifecycle, LoginCredentials, LoginResponse } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  lifecycle: AuthLifecycle;
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
  const [lifecycle, setLifecycle] = useState<AuthLifecycle>('initializing');
  const router = useRouter();
  const pathname = usePathname();

  // Cold session restoration and verification
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const storedToken = sessionManager.getToken();
        const storedUser = sessionManager.getUser();

        if (storedToken && storedUser) {
          if (!isMounted) return;
          setToken(storedToken);
          setUser(storedUser);

          // Verify token against backend verification endpoint
          try {
            const verifyRes = await apiClient.get('/api/v1/auth/verify');
            if (verifyRes && verifyRes.success) {
              if (isMounted) {
                setLifecycle('authenticated');
                realtimeManager.connect();
                if (storedUser.assignedStoreId && storedUser.assignedStoreId !== 'all') {
                  realtimeManager.joinStore(storedUser.assignedStoreId);
                }
              }
              return;
            }
          } catch (err: any) {
            console.warn('[Auth] Token verification failed:', err.message);
            sessionManager.clearSession();
            if (isMounted) {
              setToken(null);
              setUser(null);
              setLifecycle(err.status === 401 ? 'session-expired' : 'unauthenticated');
            }
            return;
          }
        }

        if (isMounted) {
          setLifecycle('unauthenticated');
        }
      } catch (err) {
        console.error('[Auth] Error restoring session:', err);
        sessionManager.clearSession();
        if (isMounted) {
          setToken(null);
          setUser(null);
          setLifecycle('unauthenticated');
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const logout = useCallback(async () => {
    setLifecycle('logging-out');
    try {
      if (token) {
        await apiClient.post('/api/v1/auth/logout', {}).catch(() => {});
      }
    } finally {
      sessionManager.clearSession();
      realtimeManager.disconnect();
      setUser(null);
      setToken(null);
      setLifecycle('unauthenticated');
      router.push('/login');
    }
  }, [token, router]);

  // Handle automatic 401 session expiration from API client
  useEffect(() => {
    registerSessionExpiredCallback(() => {
      sessionManager.clearSession();
      realtimeManager.disconnect();
      setUser(null);
      setToken(null);
      setLifecycle('session-expired');
      router.push('/login');
    });
  }, [router]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthUser> => {
    setLifecycle('authenticating');

    try {
      const res = await apiClient.post<LoginResponse>('/api/v1/auth/login', credentials, {
        skipAuth: true
      });

      if (res.success && res.token && res.user) {
        sessionManager.setToken(res.token);
        sessionManager.setUser(res.user);
        setToken(res.token);
        setUser(res.user);
        setLifecycle('authenticated');

        realtimeManager.connect();
        if (res.user.assignedStoreId && res.user.assignedStoreId !== 'all') {
          realtimeManager.joinStore(res.user.assignedStoreId);
        }

        return res.user;
      }

      setLifecycle('unauthenticated');
      throw new Error('Authentication failed: Invalid response from server');
    } catch (err) {
      setLifecycle('unauthenticated');
      throw err;
    }
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.category === 'super admin' || user.category === 'owner') return true;
    if (user.permissions?.includes('*')) return true;
    if (Array.isArray(user.permissions)) {
      return user.permissions.includes(permission);
    }
    // Default role fallback when permissions array is omitted on user object (e.g. mock test user)
    const userRole = (user.role || '').toUpperCase();
    const userCat = (user.category || '').toLowerCase();

    if (
      userCat === 'admin' ||
      userCat === 'super admin' ||
      userCat === 'owner' ||
      userRole === 'SUPER ADMIN' ||
      userRole === 'ADMIN' ||
      userRole === 'OWNER'
    ) {
      return true;
    }

    if (userCat === 'employee' || userRole === 'CASHIER' || userRole === 'STAFF') {
      const defaultCashierPerms = [
        'dashboard.view',
        'pos.create',
        'invoices.create',
        'invoices.view',
        'customers.view',
        'products.view',
        'settings.view',
        'preferences.view'
      ];
      return defaultCashierPerms.includes(permission);
    }
    if (userCat === 'auditor' || userRole === 'AUDITOR') {
      const defaultAuditorPerms = [
        'dashboard.view',
        'products.view',
        'inventory.view',
        'purchases.view',
        'invoices.view',
        'audit.view'
      ];
      return defaultAuditorPerms.includes(permission);
    }
    return false;
  }, [user]);

  const isStoreAuthorized = useCallback((storeId: string): boolean => {
    if (!user) return false;
    const userCat = (user.category || '').toLowerCase();
    const userRole = (user.role || '').toUpperCase();
    if (
      userCat === 'super admin' ||
      userCat === 'owner' ||
      userRole === 'SUPER ADMIN' ||
      userRole === 'OWNER' ||
      user.assignedStoreId === 'all'
    ) {
      return true;
    }
    if (user.assignedStoreId === storeId) return true;
    return Boolean(user.assignedStores?.includes(storeId));
  }, [user]);

  const value: AuthContextValue = {
    user,
    token,
    lifecycle,
    isAuthenticated: lifecycle === 'authenticated' && Boolean(user && token),
    isLoading: lifecycle === 'initializing' || lifecycle === 'authenticating' || lifecycle === 'logging-out',
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
