'use client';

import React from 'react';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Panel({ title, subtitle, action, children, className = '', ...props }: PanelProps) {
  return (
    <div
      className={`bg-[#032154] border border-white/10 rounded-2xl overflow-hidden shadow-sm ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-white">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}
