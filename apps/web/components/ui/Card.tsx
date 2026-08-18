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
    default: 'bg-white border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.04)] text-slate-900',
    elevated: 'bg-white border border-slate-200 shadow-[0_18px_46px_rgba(15,23,42,0.07)] text-slate-900',
    subtle: 'bg-slate-50/80 border border-slate-200/80 text-slate-900',
    interactive:
      'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 active:bg-slate-100 cursor-pointer transition-colors shadow-[0_10px_30px_rgba(15,23,42,0.04)] text-slate-900'
  };

  return (
    <div
      className={`rounded-lg p-5 sm:p-6 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
