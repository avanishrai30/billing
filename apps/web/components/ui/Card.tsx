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
    default: 'bg-[#0f172a] border border-white/10 shadow-xs',
    elevated: 'bg-[#1a2542] border border-white/15 shadow-sm',
    subtle: 'bg-[#090d16] border border-white/5',
    interactive:
      'bg-[#0f172a] border border-white/10 hover:border-white/20 hover:bg-[#131d33] active:bg-[#16223b] cursor-pointer transition-colors shadow-xs'
  };

  return (
    <div
      className={`rounded-xl p-5 sm:p-6 text-white ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

