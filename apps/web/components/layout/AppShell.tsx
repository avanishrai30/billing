'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Workspace } from './Workspace';

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[var(--bg-canvas)] text-slate-950 flex overflow-hidden">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-[17rem] h-full min-h-0 overflow-hidden">
        <Topbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <Workspace>
          {children}
        </Workspace>
      </div>
    </div>
  );
}
