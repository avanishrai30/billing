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
  stores: StoreDoc[];
  isLoadingStores: boolean;
  activeStore: StoreDoc | null;
  switchStore: (storeId: string) => void;
}

const StoreScopeContext = createContext<StoreScopeContextValue | null>(null);

const STORE_SCOPE_STORAGE_KEY = 'aiavro_selected_store_id';

export function StoreScopeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: stores = [], isLoading: isLoadingStores } = useStoresQuery();

  // Determine if the user is locked to an assigned store
  const isRestricted = useMemo(() => {
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    const category = (user.category || '').toLowerCase();
    if (role.includes('super') || category === 'super admin') return false;
    return !!(user.assignedStoreId && user.assignedStoreId !== 'all' && user.assignedStoreId !== 'none');
  }, [user]);

  const assignedStoreId = user?.assignedStoreId;

  // Initialize selected store state
  const [selectedStoreId, setSelectedStoreId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORE_SCOPE_STORAGE_KEY);
      if (stored) return stored;
    }
    return 'all';
  });

  // Sync state if user restriction changes
  useEffect(() => {
    if (isRestricted && assignedStoreId) {
      setSelectedStoreId(assignedStoreId);
      realtimeManager.joinStore(assignedStoreId);
    }
  }, [isRestricted, assignedStoreId]);

  // Fallback to 'all' if selected store is invalid or does not exist in stores list
  useEffect(() => {
    if (!isLoadingStores && !isRestricted && selectedStoreId !== 'all' && stores.length > 0) {
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
  }, [isLoadingStores, isRestricted, selectedStoreId, stores]);

  // Compute effective active store ID
  const activeStoreId = useMemo(() => {
    if (isRestricted && assignedStoreId) {
      return assignedStoreId;
    }
    return selectedStoreId || 'all';
  }, [isRestricted, assignedStoreId, selectedStoreId]);

  // Switch store handler with room transition
  const switchStore = useCallback(
    (newStoreId: string) => {
      if (isRestricted && assignedStoreId && newStoreId !== assignedStoreId) {
        console.warn(`[StoreScope] Restricted user cannot switch away from assigned store: ${assignedStoreId}`);
        return;
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
    [isRestricted, assignedStoreId]
  );

  // Active store object lookup
  const activeStore = useMemo(() => {
    if (activeStoreId === 'all') return null;
    return stores.find((s) => s.id === activeStoreId) || null;
  }, [stores, activeStoreId]);

  const isAllStores = activeStoreId === 'all';
  const effectiveStoreId = isAllStores ? undefined : activeStoreId;

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
      stores,
      isLoadingStores,
      activeStore,
      switchStore
    ]
  );

  return (
    <StoreScopeContext.Provider value={value}>
      {children}
    </StoreScopeContext.Provider>
  );
}

export function useStoreScope(): StoreScopeContextValue {
  const context = useContext(StoreScopeContext);
  if (!context) {
    // Provide safe fallback context for testing or unmounted components
    return {
      scope: { mode: 'all', storeId: 'all' },
      activeStoreId: 'all',
      effectiveStoreId: undefined,
      isAllStores: true,
      isRestricted: false,
      stores: [],
      isLoadingStores: false,
      activeStore: null,
      switchStore: () => {}
    };
  }
  return context;
}
