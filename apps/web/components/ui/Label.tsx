'use client';

import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ children, required, className = '', ...props }: LabelProps) {
  return (
    <label
      className={`block text-xs font-semibold text-slate-300 uppercase tracking-wider select-none ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-rose-400 ml-1" aria-hidden="true">*</span>}
    </label>
  );
}
