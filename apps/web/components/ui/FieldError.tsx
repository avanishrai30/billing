'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FieldErrorProps {
  error?: string | null;
  className?: string;
}

export function FieldError({ error, className = '' }: FieldErrorProps) {
  if (!error) return null;

  return (
    <div
      role="alert"
      className={`flex items-center gap-1.5 text-xs text-rose-400 mt-1.5 ${className}`}
    >
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
}
