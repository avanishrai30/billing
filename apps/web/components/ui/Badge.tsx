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
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  brand: 'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-indigo-50 text-indigo-700 border-indigo-200'
};

const dotColors: Record<BadgeVariant, string> = {
  neutral: 'bg-slate-500',
  brand: 'bg-blue-600',
  success: 'bg-emerald-600',
  warning: 'bg-amber-600',
  danger: 'bg-rose-600',
  info: 'bg-indigo-600'
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px] rounded-md gap-1',
  md: 'px-2.5 py-0.5 text-xs rounded-md gap-1.5'
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
      className={`inline-flex items-center font-medium border select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
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
  | 'pending'
  | 'completed'
  | 'paid'
  | 'partially_paid'
  | 'void'
  | 'voided'
  | 'cancelled'
  | 'draft'
  | 'low_stock'
  | 'out_of_stock'
  | 'in_stock';

export interface StatusBadgeProps {
  status: StatusType | string;
  size?: BadgeSize;
  className?: string;
}

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const normalized = (status || '').toLowerCase().trim();
  let variant: BadgeVariant = 'neutral';
  let label = (status || '').replace(/_/g, ' ');

  switch (normalized) {
    case 'active':
    case 'completed':
    case 'paid':
    case 'in_stock':
      variant = 'success';
      label = normalized === 'in_stock' ? 'In Stock' : label;
      break;
    case 'pending':
    case 'draft':
    case 'partially_paid':
    case 'low_stock':
      variant = 'warning';
      label = normalized === 'low_stock' ? 'Low Stock' : label;
      break;
    case 'inactive':
    case 'suspended':
    case 'void':
    case 'voided':
    case 'cancelled':
    case 'out_of_stock':
      variant = 'danger';
      label = normalized === 'out_of_stock' ? 'Out of Stock' : label;
      break;
    default:
      variant = 'neutral';
      break;
  }

  return (
    <Badge variant={variant} size={size} dot className={className}>
      {label}
    </Badge>
  );
}

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  onRemove?: () => void;
}

export function Tag({ children, onRemove, className = '', ...props }: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
      {...props}
    >
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove tag"
            className="p-0.5 hover:bg-slate-200 rounded-xs text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
