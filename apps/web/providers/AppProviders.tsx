'use client';

import React from 'react';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { RealtimeProvider } from './RealtimeProvider';
import { ToastProvider } from '../components/ui/Toast';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <RealtimeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </RealtimeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
