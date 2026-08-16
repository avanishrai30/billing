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
    default: 'bg-[#032154] border border-white/10 shadow-sm',
    elevated: 'bg-[#042968] border border-white/15 shadow-md',
    subtle: 'bg-[#021b47] border border-white/5',
    interactive:
      'bg-[#032154] border border-white/10 hover:border-white/20 active:bg-[#042968] cursor-pointer transition-colors shadow-sm'
  };

  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 text-white ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
