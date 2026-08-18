'use client';

import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError = false, disabled, className = '', rows = 3, ...props }, ref) => {
    const errorBorder = hasError
      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 text-rose-900'
      : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={`w-full py-2 px-3 bg-white rounded-lg text-slate-900 text-xs placeholder-slate-400 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed border ${errorBorder} ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

