'use client';

import React from 'react';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { RealtimeProvider } from './RealtimeProvider';
import { StoreScopeProvider } from './StoreScopeProvider';
import { ToastProvider } from '../components/ui/Toast';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <RealtimeProvider>
          <StoreScopeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </StoreScopeProvider>
        </RealtimeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
