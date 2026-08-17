'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

export default function RootIndexPage() {
  const { isAuthenticated, isLoading, lifecycle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && lifecycle === 'authenticated') {
      router.replace('/dashboard');
    } else if (!isAuthenticated || lifecycle === 'unauthenticated' || lifecycle === 'session-expired') {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, lifecycle, router]);

  return (
    <div className="min-h-screen w-full bg-[#001845] flex items-center justify-center" aria-hidden="true">
      {/* Zero text flash during immediate router handover */}
    </div>
  );
}
