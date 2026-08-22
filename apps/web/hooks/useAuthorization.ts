'use client';

import { useCallback } from 'react';
import { useAuth } from './useAuth';

export function useAuthorization() {
  const auth = useAuth();
  const { hasPermission } = auth;

  const can = useCallback((permission: string): boolean => {
    return hasPermission(permission);
  }, [hasPermission]);

  const canAny = useCallback((permissions: string[]): boolean => {
    return permissions.some((permission) => hasPermission(permission));
  }, [hasPermission]);

  const canAll = useCallback((permissions: string[]): boolean => {
    return permissions.every((permission) => hasPermission(permission));
  }, [hasPermission]);

  return {
    ...auth,
    can,
    canAny,
    canAll
  };
}
