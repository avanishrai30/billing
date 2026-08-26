'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStoresQuery } from '../features/stores/hooks';
import { realtimeManager } from '../lib/realtime/socket';
import type { StoreDoc } from '../features/stores/types';

export type StoreScope =
  | { mode: 'all'; storeId: 'all' }
  | { mode: 'store'; storeId: string };

export interface StoreScopeContextValue {
  scope: StoreScope;
  activeStoreId: string; // 'all' or specific store ID
  effectiveStoreId: string | undefined; // undefined if 'all', or store ID string
  isAllStores: boolean;
  isRestricted: boolean;
  canAccessAllStores: boolean;
  isSingleStoreRestricted: boolean;
  isMultiStoreRestricted: boolean;
  userAssignedStores: string[];
  allowedStores: StoreDoc[];
  currentLocationId: string | undefined;
  authorizedLocations: StoreDoc[];
  isWarehouse: boolean;
  isSuperAdmin: boolean;
  canViewAllLocations: boolean;
  stores: StoreDoc[];
  isLoadingStores: boolean;
  activeStore: StoreDoc | null;
  switchStore: (storeId: string) => void;
}

const StoreScopeContext = createContext<StoreScopeContextValue | null>(null);

const STORE_SCOPE_STORAGE_KEY = 'aiavro_selected_store_id';

export function StoreScopeProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { data: stores = [], isLoading: isLoadingStores } = useStoresQuery({
    enabled: isAuthenticated
  });

  // Extract user's authoritative assigned stores
  const { userAssignedStores, canAccessAllStores, isSuperAdminUser } = useMemo(() => {
    if (!user) {
      return { userAssignedStores: [], canAccessAllStores: false, isSuperAdminUser: false };
    }

    const role = (user.role || '').toLowerCase();
    const category = (user.category || '').toLowerCase();
    const isSuper =
      role === 'super admin' ||
      role === 'superadmin' ||
      role === 'super_admin' ||
      category === 'super admin' ||
      category === 'superadmin' ||
      category === 'owner';

    const rawStores = Array.isArray(user.assignedStores) && user.assignedStores.length > 0
      ? user.assignedStores
      : (user.assignedStoreId ? [user.assignedStoreId] : []);

    const hasGlobalScope = isSuper || (category === 'admin' && (rawStores.includes('all') || user.assignedStoreId === 'all'));

    if (hasGlobalScope) {
      return { userAssignedStores: ['all'], canAccessAllStores: true, isSuperAdminUser: isSuper };
    }

    const sanitizedStores = rawStores.filter(s => s && s !== 'all' && s !== 'none');
    return {
      userAssignedStores: sanitizedStores.length > 0 ? sanitizedStores : (user.assignedStoreId ? [user.assignedStoreId] : []),
      canAccessAllStores: false,
      isSuperAdminUser: isSuper
    };
  }, [user]);

  const isRestricted = !canAccessAllStores;
  const isSingleStoreRestricted = isRestricted && userAssignedStores.length === 1;
  const isMultiStoreRestricted = isRestricted && userAssignedStores.length > 1;

  // Filter allowed stores based on user permissions
  const allowedStores = useMemo(() => {
    if (canAccessAllStores) {
      return stores;
    }
    return stores.filter(s => userAssignedStores.includes(s.id));
  }, [canAccessAllStores, stores, userAssignedStores]);

  // Default initial store ID
  const [selectedStoreId, setSelectedStoreId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORE_SCOPE_STORAGE_KEY);
      if (stored) return stored;
    }
    return 'all';
  });

  // Enforce valid store selection when user permissions or stores load
  useEffect(() => {
    if (isRestricted && userAssignedStores.length > 0) {
      if (selectedStoreId === 'all' || !userAssignedStores.includes(selectedStoreId)) {
        const assignedId = user?.assignedStoreId;
        const fallbackStore = assignedId && userAssignedStores.includes(assignedId)
          ? assignedId
          : userAssignedStores[0];
        setSelectedStoreId(fallbackStore);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORE_SCOPE_STORAGE_KEY, fallbackStore);
        }
        realtimeManager.joinStore(fallbackStore);
      }
    }
  }, [isRestricted, userAssignedStores, selectedStoreId, user?.assignedStoreId]);

  // Fallback to 'all' if selected store is invalid in global admin mode
  useEffect(() => {
    if (!isLoadingStores && canAccessAllStores && selectedStoreId !== 'all' && stores.length > 0) {
      const storeExists = stores.some((s) => s.id === selectedStoreId);
      if (!storeExists) {
        console.warn(
          `[StoreScope] Persisted store '${selectedStoreId}' not found in active stores list. Falling back to 'all'.`
        );
        setSelectedStoreId('all');
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORE_SCOPE_STORAGE_KEY, 'all');
        }
      }
    }
  }, [isLoadingStores, canAccessAllStores, selectedStoreId, stores]);

  // Compute effective active store ID
  const activeStoreId = useMemo(() => {
    if (isRestricted) {
      if (userAssignedStores.length === 1) return userAssignedStores[0];
      if (userAssignedStores.includes(selectedStoreId)) return selectedStoreId;
      return user?.assignedStoreId || userAssignedStores[0] || 'none';
    }
    return selectedStoreId || 'all';
  }, [isRestricted, userAssignedStores, selectedStoreId, user?.assignedStoreId]);

  // Switch store handler with room transition
  const switchStore = useCallback(
    (newStoreId: string) => {
      if (isRestricted) {
        if (newStoreId === 'all' || !userAssignedStores.includes(newStoreId)) {
          console.warn(`[StoreScope] Restricted user cannot switch away from assigned store: ${userAssignedStores[0] || 'all'}`);
          return;
        }
      }

      setSelectedStoreId(newStoreId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORE_SCOPE_STORAGE_KEY, newStoreId);
      }

      // Synchronize Socket.IO room subscription
      if (newStoreId && newStoreId !== 'all' && newStoreId !== 'default') {
        realtimeManager.joinStore(newStoreId);
      }
    },
    [isRestricted, userAssignedStores]
  );

  // Active store object lookup
  const activeStore = useMemo(() => {
    if (activeStoreId === 'all') return null;
    return stores.find((s) => s.id === activeStoreId) || null;
  }, [stores, activeStoreId]);

  const isAllStores = activeStoreId === 'all';
  const effectiveStoreId = isAllStores ? undefined : activeStoreId;
  const currentLocationId = effectiveStoreId;
  const authorizedLocations = allowedStores;
  const isWarehouse = activeStore?.locationType === 'WAREHOUSE';
  const canViewAllLocations = canAccessAllStores;

  const scope: StoreScope = useMemo(() => {
    if (isAllStores) {
      return { mode: 'all', storeId: 'all' };
    }
    return { mode: 'store', storeId: activeStoreId };
  }, [isAllStores, activeStoreId]);

  const value = useMemo<StoreScopeContextValue>(
    () => ({
      scope,
      activeStoreId,
      effectiveStoreId,
      isAllStores,
      isRestricted,
      canAccessAllStores,
      isSingleStoreRestricted,
      isMultiStoreRestricted,
      userAssignedStores,
      allowedStores,
      currentLocationId,
      authorizedLocations,
      isWarehouse,
      isSuperAdmin: isSuperAdminUser,
      canViewAllLocations,
      stores,
      isLoadingStores,
      activeStore,
      switchStore
    }),
    [
      scope,
      activeStoreId,
      effectiveStoreId,
      isAllStores,
      isRestricted,
      canAccessAllStores,
      isSingleStoreRestricted,
      isMultiStoreRestricted,
      userAssignedStores,
      allowedStores,
      currentLocationId,
      authorizedLocations,
      isWarehouse,
      isSuperAdminUser,
      canViewAllLocations,
      stores,
      isLoadingStores,
      activeStore,
      switchStore
    ]
  );

  return <StoreScopeContext.Provider value={value}>{children}</StoreScopeContext.Provider>;
}

export function useStoreScope(): StoreScopeContextValue {
  const context = useContext(StoreScopeContext);
  if (!context) {
    throw new Error('useStoreScope must be used within a StoreScopeProvider');
  }
  return context;
}
