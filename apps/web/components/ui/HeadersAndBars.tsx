'use client';

import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  breadcrumbs,
  actions,
  className = ''
}: PageHeaderProps) {
  return (
    <div className={`space-y-2 border-b border-slate-200/80 pb-5 mb-6 ${className}`}>
      {breadcrumbs && <div className="text-xs text-slate-500 mb-1">{breadcrumbs}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-[1.7rem] font-semibold tracking-tight text-slate-950 leading-tight">{title}</h1>
            {badge}
          </div>
          {description && <p className="text-sm text-slate-600 max-w-3xl leading-6">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 border-b border-slate-200/80 pb-3 mb-4 ${className}`}>
      <div>
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        {subtitle && <p className="text-xs text-slate-600 mt-1 leading-5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export interface ToolbarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function Toolbar({ left, right, className = '' }: ToolbarProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-white border border-slate-200 rounded-lg mb-4 shadow-[0_8px_28px_rgba(15,23,42,0.035)] ${className}`}
    >
      <div className="flex items-center gap-2 flex-wrap">{left}</div>
      <div className="flex items-center gap-2 flex-wrap">{right}</div>
    </div>
  );
}

export interface FilterBarProps {
  children: React.ReactNode;
  onReset?: () => void;
  className?: string;
}

export function FilterBar({ children, onReset, className = '' }: FilterBarProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4 bg-white border border-slate-200 rounded-lg mb-4 shadow-[0_8px_28px_rgba(15,23,42,0.035)] ${className}`}
    >
      {children}
    </div>
  );
}
