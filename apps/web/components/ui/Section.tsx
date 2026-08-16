'use client';

import React from 'react';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function Section({ title, description, action, children, className = '', ...props }: SectionProps) {
  return (
    <section className={`space-y-4 ${className}`} {...props}>
      {(title || description || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            {title && <h2 className="text-base font-semibold text-white tracking-tight">{title}</h2>}
            {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
          </div>
          {action && <div className="flex items-center gap-2 mt-2 sm:mt-0">{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'vertical' | 'horizontal';
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
}

const gapStyles = {
  xs: 'gap-1.5',
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8'
};

const alignStyles = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch'
};

const justifyStyles = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around'
};

export function Stack({
  direction = 'vertical',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  children,
  className = '',
  ...props
}: StackProps) {
  const dirClass = direction === 'vertical' ? 'flex flex-col' : 'flex flex-row';
  const wrapClass = wrap ? 'flex-wrap' : 'flex-nowrap';

  return (
    <div
      className={`${dirClass} ${wrapClass} ${gapStyles[gap]} ${alignStyles[align]} ${justifyStyles[justify]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  label?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Divider({ label, orientation = 'horizontal', className = '', ...props }: DividerProps) {
  if (orientation === 'vertical') {
    return <div className={`w-[1px] bg-white/10 self-stretch ${className}`} />;
  }

  if (label) {
    return (
      <div className={`flex items-center gap-3 w-full my-4 ${className}`}>
        <div className="flex-1 h-[1px] bg-white/10" />
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        <div className="flex-1 h-[1px] bg-white/10" />
      </div>
    );
  }

  return <hr className={`border-0 h-[1px] bg-white/10 my-4 w-full ${className}`} {...props} />;
}
