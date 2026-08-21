'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { AppShell } from '../../components/layout/AppShell';

export default function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, lifecycle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || lifecycle === 'unauthenticated' || lifecycle === 'session-expired')) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, lifecycle, router]);

  if (isLoading || lifecycle === 'initializing' || lifecycle === 'authenticating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#001845] text-slate-300 text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono">Verifying authentication session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
