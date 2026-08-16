'use client';

import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError = false, disabled, className = '', rows = 3, ...props }, ref) => {
    const errorBorder = hasError
      ? 'border-rose-500/50 focus:border-rose-400 focus:ring-1 focus:ring-rose-400'
      : 'border-white/15 focus:border-sky-400 focus:ring-1 focus:ring-sky-400';

    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={`w-full py-2.5 px-3.5 bg-[#021b47] rounded-xl text-white text-sm placeholder-slate-500 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed border ${errorBorder} ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
