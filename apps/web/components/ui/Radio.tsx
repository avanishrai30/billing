'use client';

import React, { forwardRef } from 'react';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, helperText, disabled, className = '', id, checked, ...props }, ref) => {
    const inputId = id || (label ? `radio-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

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
            type="radio"
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <div className="w-4 h-4 rounded-full border border-white/20 bg-[#021b47] peer-checked:border-sky-500 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-400 transition-colors flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-sky-500 opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
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

Radio.displayName = 'Radio';
