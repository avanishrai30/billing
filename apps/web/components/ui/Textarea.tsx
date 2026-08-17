'use client';

import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError = false, disabled, className = '', rows = 3, ...props }, ref) => {
    const errorBorder = hasError
      ? 'border-rose-500/50 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/40 text-rose-200'
      : 'border-white/10 hover:border-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30';

    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={`w-full py-2 px-3 bg-[#0f172a] rounded-lg text-white text-xs placeholder-slate-500 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed border ${errorBorder} ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

