'use client';

import React from 'react';

export function Workspace({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
      {children}
    </main>
  );
}
