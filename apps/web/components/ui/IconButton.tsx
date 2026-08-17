'use client';

import React, { forwardRef } from 'react';
import { ButtonVariant, ButtonSize } from './Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  'aria-label': string;
  icon: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-xs shadow-blue-600/30 border border-blue-500/40',
  secondary:
    'bg-[#131d33] hover:bg-[#1a2542] active:bg-[#0f172a] text-slate-200 border border-white/10 hover:border-white/20 shadow-xs',
  ghost:
    'bg-transparent hover:bg-white/5 active:bg-white/10 text-slate-300 hover:text-white border border-transparent',
  danger:
    'bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/35 text-rose-300 border border-rose-500/30 shadow-xs',
  success:
    'bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 shadow-xs',
  outline:
    'bg-transparent hover:bg-white/5 active:bg-white/10 text-slate-200 border border-white/20 hover:border-white/40'
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'w-8 h-8 rounded-lg text-xs',
  md: 'w-9 h-9 rounded-lg text-xs',
  lg: 'w-10.5 h-10.5 rounded-xl text-sm'
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      icon,
      disabled,
      className = '',
      type = 'button',
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-medium transition-colors focus-ring cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span
            className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        ) : (
          icon
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

