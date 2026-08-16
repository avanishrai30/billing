'use client';

import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  density?: 'dense' | 'comfortable';
  stickyHeader?: boolean;
}

const TableContext = React.createContext<{ density: 'dense' | 'comfortable' }>({
  density: 'comfortable'
});

export function Table({
  density = 'comfortable',
  stickyHeader = false,
  children,
  className = '',
  ...props
}: TableProps) {
  return (
    <TableContext.Provider value={{ density }}>
      <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-[#032154]">
        <table className={`w-full text-left text-xs text-slate-300 ${className}`} {...props}>
          {children}
        </table>
      </div>
    </TableContext.Provider>
  );
}

export function TableHeader({ children, className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`bg-[#021b47] border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[11px] ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-white/5 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isInteractive?: boolean;
}

export function TableRow({ isInteractive = false, children, className = '', ...props }: TableRowProps) {
  return (
    <tr
      className={`transition-colors ${
        isInteractive ? 'hover:bg-white/5 cursor-pointer' : 'hover:bg-white/[0.02]'
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
  isNumeric?: boolean;
}

export function TableHead({
  align,
  isNumeric = false,
  children,
  className = '',
  ...props
}: TableHeadProps) {
  const { density } = React.useContext(TableContext);
  const padding = density === 'dense' ? 'py-2 px-3' : 'py-3.5 px-4';
  const textAlign = align ? `text-${align}` : isNumeric ? 'text-right' : 'text-left';

  return (
    <th className={`${padding} ${textAlign} font-semibold ${className}`} {...props}>
      {children}
    </th>
  );
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
  isNumeric?: boolean;
}

export function TableCell({
  align,
  isNumeric = false,
  children,
  className = '',
  ...props
}: TableCellProps) {
  const { density } = React.useContext(TableContext);
  const padding = density === 'dense' ? 'py-2 px-3' : 'py-3.5 px-4';
  const textAlign = align ? `text-${align}` : isNumeric ? 'text-right' : 'text-left';
  const numericClass = isNumeric ? 'tabular-nums font-mono' : '';

  return (
    <td className={`${padding} ${textAlign} ${numericClass} ${className}`} {...props}>
      {children}
    </td>
  );
}
