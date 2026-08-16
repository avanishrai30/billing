'use client';

import React, { forwardRef } from 'react';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, helperText, disabled, className = '', id, checked, ...props }, ref) => {
    const inputId = id || (label ? `switch-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

    return (
      <label
        htmlFor={inputId}
        className={`inline-flex items-center gap-3 cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        <div className="relative inline-flex items-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <div className="w-9 h-5 bg-[#032154] border border-white/20 peer-checked:bg-sky-500 peer-checked:border-sky-500 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-sky-400" />
          <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-150 peer-checked:translate-x-4" />
        </div>
        {(label || helperText) && (
          <div className="flex flex-col">
            {label && <span className="text-xs font-medium text-slate-200">{label}</span>}
            {helperText && <span className="text-[11px] text-slate-400">{helperText}</span>}
          </div>
        )}
      </label>
    );
  }
);

Switch.displayName = 'Switch';
