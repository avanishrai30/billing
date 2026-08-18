'use client';

import React from 'react';
import { Users } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  EmptyState
} from '../../../components/ui';
import type { B2CInvoiceEntry } from '../types';

export interface B2CSalesTableProps {
  entries: B2CInvoiceEntry[];
  isLoading: boolean;
}

export function B2CSalesTable({ entries, isLoading }: B2CSalesTableProps) {
  const [isMobileLayout, setIsMobileLayout] = React.useState(false);

  React.useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncLayout = () => setIsMobileLayout(mediaQuery.matches);

    syncLayout();
    mediaQuery.addEventListener('change', syncLayout);
    return () => mediaQuery.removeEventListener('change', syncLayout);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-sm shadow-xs">
        Loading B2C retail consumer bills...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Users className="w-8 h-8 text-slate-400" />}
        title="No B2C Retail Sales"
        description="Consumer bills issued to walk-in retail shoppers will appear here."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <h3 className="text-sm font-semibold text-slate-950 tracking-tight">
          B2C Retail Consumer Bills (Walk-in Sales)
        </h3>
        <span className="text-xs text-emerald-700 font-mono font-semibold tabular-nums">
          {entries.length} Consumer Bills
        </span>
      </div>

      {isMobileLayout && (
      <div className="divide-y divide-slate-100">
        {entries.map((item, idx) => {
          const dateStr = item.date
            ? new Date(item.date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: '2-digit'
              })
            : 'N/A';

          return (
            <div key={`${item.invoiceId}-${idx}`} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs font-semibold text-blue-700">{item.invoiceId}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{dateStr}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">Grand Total</div>
                  <div className="font-mono text-sm font-semibold text-slate-950 tabular-nums">₹{item.grandTotal.toFixed(2)}</div>
                </div>
              </div>
              <div className="text-xs font-medium text-slate-900">{item.customerName}</div>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-[11px]">
                <div>
                  <div className="text-slate-500">Taxable</div>
                  <div className="font-mono font-semibold text-slate-900 tabular-nums">₹{item.subtotal.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-slate-500">GST</div>
                  <div className="font-mono font-semibold text-emerald-700 tabular-nums">₹{item.tax.toFixed(2)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {!isMobileLayout && (
      <div>
      <Table density="dense">
        <TableHeader>
          <tr>
            <TableHead>Invoice # & Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Store Branch</TableHead>
            <TableHead isNumeric>Taxable Value</TableHead>
            <TableHead isNumeric>GST Amount</TableHead>
            <TableHead isNumeric>Grand Total</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {entries.map((item, idx) => {
            const dateStr = item.date
              ? new Date(item.date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: '2-digit'
                })
              : 'N/A';

            return (
              <TableRow key={`${item.invoiceId}-${idx}`}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs font-semibold text-blue-700">
                      {item.invoiceId}
                    </span>
                    <span className="text-[10px] text-slate-500">{dateStr}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-xs font-medium text-slate-900 truncate max-w-[150px] block">
                    {item.customerName}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="text-xs text-slate-700">{item.storeName}</span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs text-slate-700">
                    ₹{item.subtotal.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs font-semibold text-emerald-700">
                    ₹{item.tax.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs font-semibold text-slate-950">
                    ₹{item.grandTotal.toFixed(2)}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
      )}
    </div>
  );
}
