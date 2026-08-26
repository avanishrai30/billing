'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeManager, type RealtimeEventHandler } from '../lib/realtime/socket';
import { useAuth } from './AuthProvider';
import { useToast } from '../components/ui/Toast';

interface RealtimeContextValue {
  socket: Socket | null;
  isConnected: boolean;
  subscribe: <T = any>(eventName: string, handler: RealtimeEventHandler<T>) => () => void;
  joinStore: (storeId: string) => void;
  leaveStore: (storeId: string) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, refreshSession, logout } = useAuth();
  const { info } = useToast();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated) {
      const activeSocket = realtimeManager.connect();
      setSocket(activeSocket);

      if (activeSocket) {
        setIsConnected(activeSocket.connected);

        const handleConnect = () => {
          setIsConnected(true);
          refreshSession();
          queryClient.invalidateQueries({ queryKey: ['users'] });
          queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        };
        const handleDisconnect = () => setIsConnected(false);

        activeSocket.on('connect', handleConnect);
        activeSocket.on('disconnect', handleDisconnect);

        return () => {
          activeSocket.off('connect', handleConnect);
          activeSocket.off('disconnect', handleDisconnect);
        };
      }
    } else {
      realtimeManager.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribeAccess = realtimeManager.subscribe<{ userId?: string }>('user_access_updated', (payload: any) => {
      const targetUserId = payload?.targetUserId || payload?.userId || payload?.data?.targetUserId || payload?.data?.userId;
      if (!targetUserId || targetUserId === user?.id) {
        refreshSession();
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        info('Your access permissions were updated', 'The workspace has refreshed your available actions.');
      }
    });

    const unsubscribeUser = realtimeManager.subscribe<{ userId?: string; user?: any; avatar?: string; avatarUpdatedAt?: string }>('user_updated', (payload: any) => {
      const targetUserId = payload?.userId || payload?.user?.id || payload?.data?.userId || payload?.data?.user?.id;
      const incomingUser = payload?.user || payload?.data?.user;

      if (incomingUser?.id) {
        queryClient.setQueryData<any[]>(['users', 'list'], (current: any[] | undefined) => {
          if (!current) return current;
          return current.map((u) => (u.id === incomingUser.id ? { ...u, ...incomingUser } : u));
        });
        queryClient.setQueryData<any>(['users', 'detail', incomingUser.id], (current: any) => {
          return current ? { ...current, ...incomingUser } : incomingUser;
        });
      } else if (targetUserId && (payload?.avatar !== undefined || payload?.avatarUpdatedAt !== undefined)) {
        queryClient.setQueryData<any[]>(['users', 'list'], (current: any[] | undefined) => {
          if (!current) return current;
          return current.map((u) =>
            u.id === targetUserId
              ? { ...u, avatar: payload.avatar, avatarUpdatedAt: payload.avatarUpdatedAt }
              : u
          );
        });
      }

      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });

      if (targetUserId === user?.id) {
        refreshSession();
      }
    });

    const unsubscribeRbac = realtimeManager.subscribe('rbac_updated', () => {
      refreshSession();
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
    });

    const unsubscribeRevoked = realtimeManager.subscribe('SESSION_REVOKED', () => {
      logout();
    });

    return () => {
      unsubscribeAccess();
      unsubscribeUser();
      unsubscribeRbac();
      unsubscribeRevoked();
    };
  }, [isAuthenticated, user?.id, refreshSession, logout, queryClient, info]);

  const subscribe = useCallback(<T = any>(eventName: string, handler: RealtimeEventHandler<T>) => {
    return realtimeManager.subscribe<T>(eventName, handler);
  }, []);

  const joinStore = useCallback((storeId: string) => {
    realtimeManager.joinStore(storeId);
  }, []);

  const leaveStore = useCallback((storeId: string) => {
    realtimeManager.leaveStore(storeId);
  }, []);

  const value: RealtimeContextValue = {
    socket,
    isConnected,
    subscribe,
    joinStore,
    leaveStore
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
