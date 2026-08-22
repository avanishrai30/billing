'use client';

import React from 'react';

export const iconSlotClassName =
  'inline-flex items-center justify-center shrink-0 leading-none [&>svg]:block [&>svg]:shrink-0';

export interface IconSlotProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

export function IconSlot({ children, className = '', ...props }: IconSlotProps) {
  return (
    <span className={`${iconSlotClassName} ${className}`} {...props}>
      {children}
    </span>
  );
}
