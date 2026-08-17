'use client';

import React, { forwardRef } from 'react';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isNumeric?: boolean;
  sizeVariant?: InputSize;
}

const sizeStyles: Record<InputSize, { height: string; text: string; paddingLeftWithIcon: string; paddingRightWithIcon: string; px: string }> = {
  sm: {
    height: 'h-8',
    text: 'text-xs',
    px: 'px-2.5',
    paddingLeftWithIcon: 'pl-8',
    paddingRightWithIcon: 'pr-8'
  },
  md: {
    height: 'h-9',
    text: 'text-xs',
    px: 'px-3',
    paddingLeftWithIcon: 'pl-9',
    paddingRightWithIcon: 'pr-9'
  },
  lg: {
    height: 'h-10.5',
    text: 'text-sm',
    px: 'px-3.5',
    paddingLeftWithIcon: 'pl-10',
    paddingRightWithIcon: 'pr-10'
  }
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      hasError = false,
      leftIcon,
      rightIcon,
      isNumeric = false,
      sizeVariant = 'md',
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const errorBorder = hasError
      ? 'border-rose-500/50 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/40 text-rose-200'
      : 'border-white/10 hover:border-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30';

    const sz = sizeStyles[sizeVariant];

    return (
      <div className="relative w-full flex items-center">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full ${sz.height} ${sz.text} bg-[#0f172a] rounded-lg text-white placeholder-slate-500 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            leftIcon ? sz.paddingLeftWithIcon : sz.px
          } ${rightIcon ? sz.paddingRightWithIcon : sz.px} ${
            isNumeric ? 'tabular-nums font-mono text-right' : ''
          } ${errorBorder} border ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

