'use client';

import React from 'react';
import { Menu, LogOut, Store, UserCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const { user, logout } = useAuth();

  const storeDisplay = user?.assignedStoreId === 'all'
    ? 'All Stores (Enterprise)'
    : `Store: ${user?.assignedStoreId || 'Default'}`;

  return (
    <header className="h-16 bg-[#021b47] border-b border-white/10 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left side: Mobile menu & Context Tag */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 font-mono">
          <Store className="w-3.5 h-3.5 text-sky-400" />
          <span className="truncate max-w-[150px] sm:max-w-none">{storeDisplay}</span>
        </div>
      </div>

      {/* Right side: User info & Logout */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 text-xs font-semibold">
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserCircle className="w-4 h-4" />}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-medium text-white truncate max-w-[120px]">{user?.name || user?.username}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{user?.role || 'Staff'}</span>
          </div>
        </div>

        <button
          onClick={() => logout()}
          aria-label="Log out of session"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs border border-rose-500/20 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
