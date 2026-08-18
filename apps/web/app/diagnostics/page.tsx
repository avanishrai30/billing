'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { publicApi } from '../../lib/api/publicSettings';
import { queryKeys } from '../../lib/query/keys';
import { getApiBaseUrl } from '../../lib/api/client';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';

export default function DiagnosticsPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isConnected } = useRealtime();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Query /health endpoint
  const healthQuery = useQuery({
    queryKey: queryKeys.health(),
    queryFn: () => publicApi.getHealth(),
    retry: 1
  });

  // Query /api/v1/public/settings endpoint
  const settingsQuery = useQuery({
    queryKey: queryKeys.publicSettings(),
    queryFn: () => publicApi.getPublicSettings(),
    retry: 1
  });

  const baseUrl = mounted ? getApiBaseUrl() : 'Resolving gateway...';

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col gap-6 bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
          AIAVRO Billing OS — Infrastructure Diagnostics
        </h1>
        <p className="text-sm text-slate-500">
          Internal Diagnostics Workspace (App Router + TanStack Query + Socket.IO)
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Backend Gateway Health */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Backend Gateway</h2>
            <span
              className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                healthQuery.isLoading
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : healthQuery.isSuccess
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {healthQuery.isLoading ? 'Checking...' : healthQuery.isSuccess ? 'Connected' : 'Unavailable'}
            </span>
          </div>
          <div className="text-xs text-slate-600 space-y-1 font-mono">
            <p>Target URL: <span className="text-blue-600">{baseUrl}</span></p>
            <p>Health Status: <span className="text-slate-800 font-semibold">{healthQuery.data?.status || 'N/A'}</span></p>
            <p>Database: <span className="text-slate-800">{healthQuery.data?.database || 'N/A'}</span></p>
            <p>Uptime: <span className="text-slate-800">{healthQuery.data?.uptime || 'N/A'}</span></p>
          </div>
        </section>

        {/* Public Settings */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Public Settings API</h2>
            <span
              className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                settingsQuery.isLoading
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : settingsQuery.isSuccess
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {settingsQuery.isLoading ? 'Loading...' : settingsQuery.isSuccess ? 'Loaded' : 'Failed'}
            </span>
          </div>
          <div className="text-xs text-slate-600 space-y-1 font-mono">
            <p>Endpoint: <span className="text-blue-600">/api/v1/public/settings</span></p>
            <p>Portal Title: <span className="text-slate-800 font-semibold">{settingsQuery.data?.title || 'N/A'}</span></p>
            <p>Brand Logo: <span className="text-slate-800">{settingsQuery.data?.logo || 'N/A'}</span></p>
          </div>
        </section>

        {/* Auth State */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Auth Foundation</h2>
            <span
              className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                isAuthenticated
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {isAuthenticated ? 'Authenticated' : 'Anonymous'}
            </span>
          </div>
          <div className="text-xs text-slate-600 space-y-1 font-mono">
            <p>User: <span className="text-slate-800 font-semibold">{user?.username || 'None'}</span></p>
            <p>Role: <span className="text-slate-800">{user?.role || 'None'}</span></p>
            <p>Store: <span className="text-slate-800">{user?.assignedStoreId || 'None'}</span></p>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => logout()}
              className="mt-2 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg border border-rose-200 self-start cursor-pointer transition-colors"
            >
              Logout Session
            </button>
          )}
        </section>

        {/* Realtime Socket */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Realtime Gateway</h2>
            <span
              className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {isConnected ? 'Socket Active' : 'Disconnected'}
            </span>
          </div>
          <div className="text-xs text-slate-600 space-y-1 font-mono">
            <p>Transport: <span className="text-blue-600">WebSocket / Polling</span></p>
            <p>State: <span className="text-slate-800">{isConnected ? 'Listening for Store Events' : 'Inactive (Requires Login)'}</span></p>
          </div>
        </section>
      </div>

      <footer className="mt-8 border-t border-slate-200 pt-4 flex items-center justify-between text-xs text-slate-500">
        <div>Next.js 16 App Router | React 19 | Tailwind CSS v4</div>
        <div className="flex gap-4">
          <Link href="/login" className="text-blue-600 hover:underline">
            Login Route →
          </Link>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Protected Area →
          </Link>
        </div>
      </footer>
    </main>
  );
}
