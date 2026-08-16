'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';

export default function ProtectedRootPage() {
  const { user, logout } = useAuth();

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-6">
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Protected Workspace</h1>
          <p className="text-xs text-slate-400">Authenticated as @{user?.username} ({user?.role})</p>
        </div>
        <button
          onClick={() => logout()}
          className="text-xs bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 px-3 py-1.5 rounded-lg border border-rose-500/30"
        >
          Sign Out
        </button>
      </header>

      <div className="bg-[#032154] border border-white/10 p-6 rounded-xl space-y-3">
        <h2 className="text-sm font-semibold text-white">Phase 1 Route Guard Active</h2>
        <p className="text-xs text-slate-300">
          This area is strictly protected by <code className="text-sky-400">ProtectedLayout</code>.
          Business feature modules will be incrementally migrated into sub-routes during Phase 2+.
        </p>
      </div>

      <div className="pt-4">
        <Link href="/" className="text-xs text-sky-400 hover:underline">
          ← Back to Diagnostics
        </Link>
      </div>
    </div>
  );
}
