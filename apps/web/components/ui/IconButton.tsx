'use client';

import React, { forwardRef } from 'react';
import { ButtonVariant, ButtonSize } from './Button';
import { IconSlot } from './IconSlot';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  'aria-label': string;
  icon: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white shadow-[0_8px_18px_rgba(37,99,235,0.16)] border border-blue-700 active:scale-[0.98]',
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
  sm: 'w-8 h-8 rounded-lg text-xs',
  md: 'w-9 h-9 rounded-lg text-xs',
  lg: 'w-[42px] h-[42px] rounded-lg text-sm'
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
        className={`inline-flex items-center justify-center font-medium leading-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out focus-ring cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <IconSlot aria-hidden="true">
            <span
              className={`${spinnerSizeStyles[size]} border-2 border-current border-t-transparent rounded-full animate-spin`}
            />
          </IconSlot>
        ) : (
          <IconSlot className={iconSizeStyles[size]} aria-hidden="true">
            {icon}
          </IconSlot>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
