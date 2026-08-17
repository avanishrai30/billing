'use client';

import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { InputSize } from './Input';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  hasError?: boolean;
  placeholder?: string;
  sizeVariant?: InputSize;
}

const sizeStyles: Record<InputSize, { height: string; text: string; px: string }> = {
  sm: {
    height: 'h-8',
    text: 'text-xs',
    px: 'pl-2.5 pr-7'
  },
  md: {
    height: 'h-9',
    text: 'text-xs',
    px: 'pl-3 pr-8'
  },
  lg: {
    height: 'h-10.5',
    text: 'text-sm',
    px: 'pl-3.5 pr-9'
  }
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      hasError = false,
      placeholder,
      sizeVariant = 'md',
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const errorBorder = hasError
      ? 'border-rose-500/50 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/40 text-rose-200'
      : 'border-white/10 hover:border-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 text-white';

    const sz = sizeStyles[sizeVariant];

    return (
      <div className="relative w-full flex items-center">
        <select
          ref={ref}
          disabled={disabled}
          className={`w-full ${sz.height} ${sz.text} ${sz.px} bg-[#0f172a] rounded-lg text-white transition-colors focus:outline-none appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border ${errorBorder} ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-[#0f172a] text-slate-400">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option
              key={String(opt.value)}
              value={opt.value}
              disabled={opt.disabled}
              className="bg-[#0f172a] text-white"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';

