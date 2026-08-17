'use client';

import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { InputSize } from './Input';

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  hasError?: boolean;
  sizeVariant?: InputSize;
}

const sizeStyles: Record<InputSize, { height: string; text: string; px: string; pr: string }> = {
  sm: {
    height: 'h-8',
    text: 'text-xs',
    px: 'pl-2.5',
    pr: 'pr-8'
  },
  md: {
    height: 'h-9',
    text: 'text-xs',
    px: 'pl-3',
    pr: 'pr-9'
  },
  lg: {
    height: 'h-10.5',
    text: 'text-sm',
    px: 'pl-3.5',
    pr: 'pr-10'
  }
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ hasError = false, sizeVariant = 'md', disabled, className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const errorBorder = hasError
      ? 'border-rose-500/50 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/40 text-rose-200'
      : 'border-white/10 hover:border-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30';

    const sz = sizeStyles[sizeVariant];

    return (
      <div className="relative w-full flex items-center">
        <input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          disabled={disabled}
          className={`w-full ${sz.height} ${sz.text} ${sz.px} ${sz.pr} bg-[#0f172a] rounded-lg text-white placeholder-slate-500 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed border ${errorBorder} ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          disabled={disabled}
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none disabled:opacity-50 cursor-pointer"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

