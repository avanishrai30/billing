'use client';

import React from 'react';

export function Workspace({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 min-h-0 w-full max-w-[1600px] mx-auto px-3 py-3 sm:px-4 sm:py-3.5 lg:px-5 lg:py-3.5 overflow-y-auto flex flex-col">
      {children}
    </main>
  );
}
