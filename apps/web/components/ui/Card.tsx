'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'interactive';
}

export function Card({
  variant = 'default',
  children,
  className = '',
  ...props
}: CardProps) {
  const variantStyles = {
    default: 'bg-white border border-slate-200 shadow-xs text-slate-900',
    elevated: 'bg-white border border-slate-200 shadow-sm text-slate-900',
    subtle: 'bg-slate-50 border border-slate-200/80 text-slate-900',
    interactive:
      'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 active:bg-slate-100 cursor-pointer transition-colors shadow-xs text-slate-900'
  };

  return (
    <div
      className={`rounded-xl p-5 sm:p-6 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

