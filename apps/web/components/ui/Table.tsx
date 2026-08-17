'use client';

import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  density?: 'dense' | 'comfortable';
  stickyHeader?: boolean;
}

const TableContext = React.createContext<{ density: 'dense' | 'comfortable'; stickyHeader: boolean }>({
  density: 'comfortable',
  stickyHeader: false
});

export function Table({
  density = 'comfortable',
  stickyHeader = false,
  children,
  className = '',
  ...props
}: TableProps) {
  return (
    <TableContext.Provider value={{ density, stickyHeader }}>
      <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-[#0f172a] shadow-xs">
        <table className={`w-full text-left text-xs text-slate-300 ${className}`} {...props}>
          {children}
        </table>
      </div>
    </TableContext.Provider>
  );
}

export function TableHeader({ children, className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  const { stickyHeader } = React.useContext(TableContext);
  const stickyClass = stickyHeader ? 'sticky top-0 z-10 backdrop-blur-md bg-[#131d33]/90' : 'bg-[#131d33]';

  return (
    <thead className={`${stickyClass} border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[11px] select-none ${className}`} {...props}>
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
        isInteractive ? 'hover:bg-white/5 active:bg-white/10 cursor-pointer' : 'hover:bg-white/[0.03]'
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  isNumeric?: boolean;
}

export function TableHead({ isNumeric, children, className = '', ...props }: TableHeadProps) {
  const { density } = React.useContext(TableContext);
  const padding = density === 'dense' ? 'px-3 py-2' : 'px-4 py-3';
  const numericClass = isNumeric ? 'text-right font-mono tabular-nums' : '';

  return (
    <th className={`${padding} text-slate-400 font-semibold select-none ${numericClass} ${className}`} {...props}>
      {children}
    </th>
  );
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  isNumeric?: boolean;
}

export function TableCell({ isNumeric, children, className = '', ...props }: TableCellProps) {
  const { density } = React.useContext(TableContext);
  const padding = density === 'dense' ? 'px-3 py-2' : 'px-4 py-3';
  const numericClass = isNumeric ? 'text-right font-mono tabular-nums' : '';

  return (
    <td className={`${padding} ${numericClass} ${className}`} {...props}>
      {children}
    </td>
  );
}

export function TableEmptyRow({ colSpan, message = 'No records found' }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-10 text-slate-400 text-xs font-mono">
        {message}
      </td>
    </tr>
  );
}

