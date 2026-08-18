'use client';

import React from 'react';

export function Workspace({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 w-full max-w-[1480px] mx-auto px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6 overflow-y-auto">
      {children}
    </main>
  );
}
