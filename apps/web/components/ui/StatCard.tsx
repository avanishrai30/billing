'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: number | string;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  icon?: React.ReactNode;
  isCurrency?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  trend,
  icon,
  isCurrency = false,
  className = ''
}: StatCardProps) {
  const trendColors = {
    up: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    down: 'text-rose-700 bg-rose-50 border-rose-200',
    neutral: 'text-slate-600 bg-slate-100 border-slate-200'
  };

  const TrendIcon = trend
    ? trend.direction === 'up'
      ? TrendingUp
      : trend.direction === 'down'
      ? TrendingDown
      : Minus
    : null;

  return (
    <div
      className={`p-5 bg-white border border-slate-200 rounded-xl flex flex-col justify-between shadow-xs transition-colors hover:border-slate-300 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums font-mono">
          {isCurrency && typeof value === 'number'
            ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)
            : value}
        </div>

        {(trend || subtext) && (
          <div className="flex items-center gap-2 pt-1 text-xs">
            {trend && TrendIcon && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border font-mono ${
                  trendColors[trend.direction]
                }`}
              >
                <TrendIcon className="w-2.5 h-2.5" />
                <span>{trend.value}</span>
              </span>
            )}
            {subtext && <span className="text-[11px] text-slate-500 truncate">{subtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export interface MetricCardProps {
  title: string;
  metric: string | number;
  status?: 'normal' | 'warning' | 'critical' | 'success';
  description?: string;
  className?: string;
}

export function MetricCard({
  title,
  metric,
  status = 'normal',
  description,
  className = ''
}: MetricCardProps) {
  const statusBorder = {
    normal: 'border-slate-200 hover:border-slate-300',
    warning: 'border-amber-200',
    critical: 'border-rose-200',
    success: 'border-emerald-200'
  };

  const statusBg = {
    normal: 'bg-white',
    warning: 'bg-amber-50/60',
    critical: 'bg-rose-50/60',
    success: 'bg-emerald-50/60'
  };

  return (
    <div
      className={`p-4 border rounded-xl flex flex-col justify-between shadow-xs transition-colors ${statusBg[status]} ${statusBorder[status]} ${className}`}
    >
      <span className="text-xs text-slate-500 font-medium">{title}</span>
      <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums font-mono">{metric}</div>
      {description && <span className="text-[11px] text-slate-500 mt-1">{description}</span>}
    </div>
  );
}

