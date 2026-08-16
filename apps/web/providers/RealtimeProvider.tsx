'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { realtimeManager, type RealtimeEventHandler } from '../lib/realtime/socket';
import { useAuth } from './AuthProvider';

interface RealtimeContextValue {
  socket: Socket | null;
  isConnected: boolean;
  subscribe: <T = any>(eventName: string, handler: RealtimeEventHandler<T>) => () => void;
  joinStore: (storeId: string) => void;
  leaveStore: (storeId: string) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated) {
      const activeSocket = realtimeManager.connect();
      setSocket(activeSocket);

      if (activeSocket) {
        setIsConnected(activeSocket.connected);

        const handleConnect = () => setIsConnected(true);
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
