'use client';

import React, { forwardRef } from 'react';
import { IconSlot } from './IconSlot';

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
    'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-[0_10px_22px_rgba(37,99,235,0.18)] border border-blue-600 active:scale-[0.98]',
  secondary:
    'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-[0_6px_16px_rgba(15,23,42,0.04)] active:scale-[0.98]',
  ghost:
    'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-600 hover:text-slate-900 border border-transparent active:scale-[0.98]',
  danger:
    'bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 shadow-[0_6px_16px_rgba(225,29,72,0.08)] active:scale-[0.98]',
  success:
    'bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 border border-emerald-200 shadow-[0_6px_16px_rgba(5,150,105,0.08)] active:scale-[0.98]',
  outline:
    'bg-transparent hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 active:scale-[0.98]'
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-9 px-3.5 text-xs font-medium rounded-lg gap-2',
  lg: 'h-[42px] px-4 text-sm font-semibold rounded-lg gap-2'
};

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: '[&>svg]:!h-3.5 [&>svg]:!w-3.5',
  md: '[&>svg]:!h-4 [&>svg]:!w-4',
  lg: '[&>svg]:!h-[18px] [&>svg]:!w-[18px]'
};

const spinnerSizeStyles: Record<ButtonSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-[18px] w-[18px]'
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
      'inline-flex flex-row flex-nowrap items-center justify-center font-medium leading-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out focus-ring cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100 whitespace-nowrap';

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
            <IconSlot data-button-icon-slot="loading" aria-hidden="true">
              <span
                className={`${spinnerSizeStyles[size]} border-2 border-current border-t-transparent rounded-full animate-spin`}
              />
            </IconSlot>
            <span className="sr-only">Loading</span>
          </>
        ) : (
          leftIcon && (
            <IconSlot data-button-icon-slot="left" className={iconSizeStyles[size]} aria-hidden="true">
              {leftIcon}
            </IconSlot>
          )
        )}
        <span data-button-label="true" className="inline-flex min-w-0 items-center leading-none truncate">
          {children}
        </span>
        {!isLoading && rightIcon && (
          <IconSlot data-button-icon-slot="right" className={iconSizeStyles[size]} aria-hidden="true">
            {rightIcon}
          </IconSlot>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
