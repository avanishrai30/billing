'use client';

import React, { forwardRef } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, helperText, disabled, className = '', id, checked, ...props }, ref) => {
    const inputId = id || (label ? `cb-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

    return (
      <label
        htmlFor={inputId}
        className={`inline-flex items-start gap-2.5 cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="peer absolute inset-0 z-10 h-4 w-4 cursor-pointer opacity-0 disabled:cursor-not-allowed"
            {...props}
          />
          <div className="pointer-events-none w-4 h-4 rounded-md border border-slate-300 bg-white peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/30 transition-colors flex items-center justify-center">
            <Check className="w-3 h-3 text-white stroke-[3] opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </div>
        {(label || helperText) && (
          <div className="flex flex-col">
            {label && <span className="text-xs font-medium text-slate-800">{label}</span>}
            {helperText && <span className="text-[11px] text-slate-500">{helperText}</span>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
