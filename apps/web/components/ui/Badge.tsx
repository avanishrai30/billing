'use client';

import React from 'react';

export type BadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-white/10 text-slate-300 border-white/15',
  brand: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  danger: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  info: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
};

const dotColors: Record<BadgeVariant, string> = {
  neutral: 'bg-slate-400',
  brand: 'bg-sky-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
  info: 'bg-indigo-400'
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px] rounded-md gap-1',
  md: 'px-2.5 py-1 text-xs rounded-lg gap-1.5'
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium border uppercase tracking-wider select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} aria-hidden="true" />
      )}
      <span>{children}</span>
    </span>
  );
}

export type StatusType =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'paid'
  | 'unpaid'
  | 'partially_paid'
  | 'voided'
  | 'draft'
  | 'completed'
  | 'pending'
  | 'in_transit'
  | 'received';

export interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  let variant: BadgeVariant = 'neutral';
  let label = status;

  switch (normalized) {
    case 'active':
    case 'paid':
    case 'completed':
    case 'received':
      variant = 'success';
      break;
    case 'pending':
    case 'in_transit':
    case 'partially_paid':
    case 'draft':
      variant = 'warning';
      break;
    case 'suspended':
    case 'voided':
    case 'unpaid':
    case 'inactive':
      variant = 'danger';
      break;
    default:
      variant = 'neutral';
      break;
  }

  return (
    <Badge variant={variant} dot size="sm" className={className}>
      {label.replace(/_/g, ' ')}
    </Badge>
  );
}

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  onRemove?: () => void;
}

export function Tag({ children, onRemove, className = '', ...props }: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 font-mono ${className}`}
      {...props}
    >
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove tag"
          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          ×
        </button>
      )}
    </span>
  );
}
