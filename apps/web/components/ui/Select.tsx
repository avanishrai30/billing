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
      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 text-rose-900'
      : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900';

    const sz = sizeStyles[sizeVariant];

    return (
      <div className="relative w-full flex items-center">
        <select
          ref={ref}
          disabled={disabled}
          className={`w-full ${sz.height} ${sz.text} ${sz.px} bg-white rounded-lg text-slate-900 transition-colors focus:outline-none appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border ${errorBorder} ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-white text-slate-400">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option
              key={String(opt.value)}
              value={opt.value}
              disabled={opt.disabled}
              className="bg-white text-slate-900"
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

