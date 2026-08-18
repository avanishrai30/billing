'use client';

import React from 'react';
import { Clock, Receipt, Store } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  EmptyState
} from '../../../components/ui';
import type { Invoice } from '../../invoices/types';

export interface OutwardGSTTableProps {
  invoices: Invoice[];
  isLoading: boolean;
}

export function OutwardGSTTable({ invoices, isLoading }: OutwardGSTTableProps) {
  const [isMobileLayout, setIsMobileLayout] = React.useState(false);
  const validInvoices = invoices.filter((i) => i.status !== 'VOIDED');

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
        Loading outward sales GST ledger...
      </div>
    );
  }

  if (validInvoices.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="w-8 h-8 text-slate-400" />}
        title="No Outward Sales Transactions"
        description="Completed POS invoices and sales transactions will automatically appear here with their GST splits."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <h3 className="text-sm font-semibold text-slate-950 tracking-tight">
          Outward GST Supply Ledger (Sales Invoices)
        </h3>
        <span className="text-xs text-slate-500 font-mono tabular-nums">
          {validInvoices.length} transactions recorded
        </span>
      </div>

      {isMobileLayout && (
      <div className="divide-y divide-slate-100">
        {validInvoices.map((inv) => {
          const tax = Number(inv.tax || 0);
          const subtotal = Number(inv.subtotal || 0);
          const grandTotal = Number(inv.grandTotal || 0);
          const cgst = Math.round((tax / 2) * 100) / 100;
          const sgst = Math.round((tax / 2) * 100) / 100;
          const dateStr = inv.createdAt
            ? new Date(inv.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: '2-digit'
              })
            : 'N/A';

          return (
            <div key={inv._id || inv.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs font-semibold text-blue-700">{inv.invoiceNumber || inv.id}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{dateStr}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">Grand Total</div>
                  <div className="font-mono text-sm font-semibold text-slate-950 tabular-nums">₹{grandTotal.toFixed(2)}</div>
                </div>
              </div>
              <div className="text-xs font-medium text-slate-900">{inv.customerName || 'Retail Customer'}</div>
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-[11px]">
                <div>
                  <div className="text-slate-500">Taxable</div>
                  <div className="font-mono font-semibold text-slate-900 tabular-nums">₹{subtotal.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-slate-500">CGST</div>
                  <div className="font-mono font-semibold text-amber-700 tabular-nums">₹{cgst.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-slate-500">SGST</div>
                  <div className="font-mono font-semibold text-emerald-700 tabular-nums">₹{sgst.toFixed(2)}</div>
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
            <TableHead isNumeric>Taxable Value</TableHead>
            <TableHead isNumeric>Outward GST</TableHead>
            <TableHead isNumeric>CGST (50%)</TableHead>
            <TableHead isNumeric>SGST (50%)</TableHead>
            <TableHead isNumeric>Grand Total</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {validInvoices.map((inv) => {
            const tax = Number(inv.tax || 0);
            const subtotal = Number(inv.subtotal || 0);
            const grandTotal = Number(inv.grandTotal || 0);
            const cgst = Math.round((tax / 2) * 100) / 100;
            const sgst = Math.round((tax / 2) * 100) / 100;

            const dateStr = inv.createdAt
              ? new Date(inv.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: '2-digit'
                })
              : 'N/A';

            return (
              <TableRow key={inv._id || inv.id}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs font-semibold text-blue-700">
                      {inv.invoiceNumber || inv.id}
                    </span>
                    <span className="text-[10px] text-slate-500">{dateStr}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-xs font-medium text-slate-900 truncate max-w-[140px] block">
                    {inv.customerName || 'Retail Customer'}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs text-slate-700">
                    ₹{subtotal.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs font-semibold text-emerald-700">
                    ₹{tax.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs text-amber-700">
                    ₹{cgst.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs text-emerald-700">
                    ₹{sgst.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs font-semibold text-slate-950">
                    ₹{grandTotal.toFixed(2)}
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
