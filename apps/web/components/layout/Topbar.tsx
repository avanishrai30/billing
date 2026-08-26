'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, LogOut, Store, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useStoreScope } from '../../providers/StoreScopeProvider';
import { UserAvatar } from '../ui/UserAvatar';

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const { user, logout } = useAuth();
  const {
    activeStoreId,
    canAccessAllStores,
    isRestricted,
    isSingleStoreRestricted,
    isMultiStoreRestricted,
    allowedStores,
    stores,
    isLoadingStores,
    activeStore,
    switchStore
  } = useStoreScope();

  return (
    <header className="h-[68px] bg-white/95 border-b border-slate-200/80 px-3 sm:px-5 lg:px-7 flex items-center justify-between sticky top-0 z-30 shadow-[0_8px_28px_rgba(15,23,42,0.035)] backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 focus-ring"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700 shadow-[0_1px_0_rgba(255,255,255,0.8)]">
          <Store className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />

          {isSingleStoreRestricted ? (
            <div className="flex items-center gap-1.5 font-mono text-slate-700">
              <span className="truncate max-w-[140px] sm:max-w-none">
                {activeStore ? `${activeStore.name} (${activeStore.code})` : `Store: ${activeStoreId}`}
              </span>
              <span
                title="Store locked by user assignment"
                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-600 flex items-center gap-1"
              >
                <Lock className="w-2.5 h-2.5" />
                Locked
              </span>
            </div>
          ) : isRestricted ? (
            <select
              aria-label="Select active store outlet"
              value={activeStoreId}
              disabled={isLoadingStores}
              onChange={(e) => switchStore(e.target.value)}
              className="bg-transparent text-slate-700 font-mono text-xs focus:outline-none cursor-pointer pr-1 truncate max-w-[150px] sm:max-w-[220px]"
            >
              {allowedStores.map((s) => (
                <option key={s.id} value={s.id} className="bg-white text-slate-900">
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          ) : (
            <select
              aria-label="Select active store outlet"
              value={activeStoreId}
              disabled={isLoadingStores}
              onChange={(e) => switchStore(e.target.value)}
              className="bg-transparent text-slate-700 font-mono text-xs focus:outline-none cursor-pointer pr-1 truncate max-w-[150px] sm:max-w-[220px]"
            >
              <option value="all" className="bg-white text-slate-900">
                All Stores (Enterprise)
              </option>
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-white text-slate-900">
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/profile" className="hidden sm:flex items-center gap-2.5 rounded-lg px-1 py-1 transition-colors hover:bg-slate-50 focus-ring">
          <UserAvatar user={user} size="sm" shape="rounded" priority />
          <div className="flex flex-col text-left">
            <span className="text-xs font-medium text-slate-900 truncate max-w-[120px]">
              {user?.name || user?.username}
            </span>
            <span className="text-[10px] text-slate-500">
              {user?.role || 'Staff'}
            </span>
          </div>
        </Link>

        <button
          onClick={() => logout()}
          aria-label="Log out of session"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer focus-ring active:scale-[0.98]"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
