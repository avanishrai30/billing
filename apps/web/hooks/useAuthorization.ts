'use client';

import { useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';

export function useAuthorization() {
  const auth = useAuth();
  const { hasPermission, user } = auth;

  const can = useCallback((permission: string): boolean => {
    return hasPermission(permission);
  }, [hasPermission]);

  const canAny = useCallback((permissions: string[]): boolean => {
    return permissions.some((permission) => hasPermission(permission));
  }, [hasPermission]);

  const canAll = useCallback((permissions: string[]): boolean => {
    return permissions.every((permission) => hasPermission(permission));
  }, [hasPermission]);

  const isSuperAdmin = useMemo((): boolean => {
    if (!user) return false;
    const cat = (user.category || '').toLowerCase().trim();
    const role = (user.role || '').toUpperCase().trim();
    return cat === 'super admin' || cat === 'owner' || role === 'SUPER ADMIN' || role === 'OWNER';
  }, [user]);

  return {
    ...auth,
    can,
    canAny,
    canAll,
    isSuperAdmin
  };
}
