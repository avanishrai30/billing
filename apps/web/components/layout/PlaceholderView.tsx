'use client';

import React from 'react';

interface PlaceholderViewProps {
  title: string;
  description: string;
  phase: string;
  endpoint?: string;
}

export function PlaceholderView({ title, description, phase, endpoint }: PlaceholderViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </header>

      <div className="bg-white border border-slate-200 p-6 rounded-xl flex flex-col gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">{phase} Migration Target</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          The {title} module will be migrated during {phase} following the strict contract freeze rules.
          Backend endpoints and data will be connected authoritatively via TanStack Query.
        </p>
        {endpoint && (
          <div className="mt-2 text-xs font-mono bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-slate-700">
            Authoritative Endpoint: <span className="text-blue-600 font-semibold">{endpoint}</span>
          </div>
        )}
      </div>
    </div>
  );
}
