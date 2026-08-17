'use client';

import React, { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
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
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-9 px-3.5 text-xs font-medium rounded-lg gap-2',
  lg: 'h-10.5 px-4 text-sm font-semibold rounded-xl gap-2.5'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyle =
      'inline-flex items-center justify-center font-medium transition-colors focus-ring cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none whitespace-nowrap';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <span
              className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0"
              aria-hidden="true"
            />
            <span className="sr-only">Loading</span>
          </>
        ) : (
          leftIcon && <span className="flex-shrink-0 inline-flex items-center justify-center" aria-hidden="true">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="flex-shrink-0 inline-flex items-center justify-center" aria-hidden="true">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

