'use client';

import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isNumeric?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      hasError = false,
      leftIcon,
      rightIcon,
      isNumeric = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const errorBorder = hasError
      ? 'border-rose-500/50 focus:border-rose-400 focus:ring-1 focus:ring-rose-400'
      : 'border-white/15 focus:border-sky-400 focus:ring-1 focus:ring-sky-400';

    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full py-2.5 bg-[#021b47] rounded-xl text-white text-sm placeholder-slate-500 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            leftIcon ? 'pl-9' : 'pl-3.5'
          } ${rightIcon ? 'pr-9' : 'pr-3.5'} ${isNumeric ? 'tabular-nums text-right' : ''} ${errorBorder} border ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
