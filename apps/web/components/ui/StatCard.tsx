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
    up: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    down: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    neutral: 'text-slate-400 bg-white/5 border-white/10'
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
      className={`p-5 bg-[#0f172a] border border-white/10 rounded-xl flex flex-col justify-between shadow-xs transition-colors hover:border-white/20 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 flex-shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-bold tracking-tight text-white tabular-nums font-mono">
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
            {subtext && <span className="text-[11px] text-slate-400 truncate">{subtext}</span>}
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
    normal: 'border-white/10 hover:border-white/20',
    warning: 'border-amber-500/30',
    critical: 'border-rose-500/30',
    success: 'border-emerald-500/30'
  };

  const statusBg = {
    normal: 'bg-[#0f172a]',
    warning: 'bg-amber-500/5',
    critical: 'bg-rose-500/5',
    success: 'bg-emerald-500/5'
  };

  return (
    <div
      className={`p-4 border rounded-xl flex flex-col justify-between shadow-xs transition-colors ${statusBg[status]} ${statusBorder[status]} ${className}`}
    >
      <span className="text-xs text-slate-400 font-medium">{title}</span>
      <div className="text-xl font-bold text-white mt-1 tabular-nums font-mono">{metric}</div>
      {description && <span className="text-[11px] text-slate-400 mt-1">{description}</span>}
    </div>
  );
}

