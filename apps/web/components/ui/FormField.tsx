'use client';

import React from 'react';
import { Label } from './Label';
import { FieldError } from './FieldError';

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  helperText?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  required,
  helperText,
  error,
  children,
  className = ''
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {helperText && !error && (
        <p className="text-[11px] text-slate-400 mt-1">{helperText}</p>
      )}
      <FieldError error={error} />
    </div>
  );
}
