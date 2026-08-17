'use client';

import React from 'react';
import { Menu, LogOut, Store, UserCircle, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useStoreScope } from '../../providers/StoreScopeProvider';

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const { user, logout } = useAuth();
  const {
    activeStoreId,
    isRestricted,
    stores,
    isLoadingStores,
    activeStore,
    switchStore
  } = useStoreScope();

  return (
    <header className="h-16 bg-[#0f172a] border-b border-white/10 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left side: Mobile menu & Store Switcher */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Unified Store Selector / Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200">
          <Store className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />

          {isRestricted ? (
            <div className="flex items-center gap-1.5 font-mono text-slate-300">
              <span className="truncate max-w-[140px] sm:max-w-none">
                {activeStore ? `${activeStore.name} (${activeStore.code})` : `Store: ${activeStoreId}`}
              </span>
              <span
                title="Store locked by user assignment"
                className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-slate-400 flex items-center gap-1"
              >
                <Lock className="w-2.5 h-2.5" />
                Locked
              </span>
            </div>
          ) : (
            <select
              aria-label="Select active store outlet"
              value={activeStoreId}
              disabled={isLoadingStores}
              onChange={(e) => switchStore(e.target.value)}
              className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer pr-1 truncate max-w-[150px] sm:max-w-[220px]"
            >
              <option value="all" className="bg-[#0f172a] text-white">
                All Stores (Enterprise)
              </option>
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0f172a] text-white">
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Right side: User info & Logout */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs font-semibold">
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserCircle className="w-4 h-4" />}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-medium text-white truncate max-w-[120px]">
              {user?.name || user?.username}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              {user?.role || 'Staff'}
            </span>
          </div>
        </div>

        <button
          onClick={() => logout()}
          aria-label="Log out of session"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs border border-rose-500/20 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
