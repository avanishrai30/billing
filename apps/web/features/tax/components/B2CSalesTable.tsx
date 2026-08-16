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
  if (isLoading) {
    return (
      <div className="bg-[#021b47] border border-white/10 rounded-2xl p-6 text-center text-slate-400 text-sm">
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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#021b47]">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white tracking-tight">
          B2C Retail Consumer Bills (Walk-in Sales)
        </h3>
        <span className="text-xs text-emerald-400 font-mono font-bold">
          {entries.length} Consumer Bills
        </span>
      </div>

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
                    <span className="font-mono text-xs font-bold text-sky-400">
                      {item.invoiceId}
                    </span>
                    <span className="text-[10px] text-slate-400">{dateStr}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-xs font-medium text-white truncate max-w-[150px] block">
                    {item.customerName}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="text-xs text-slate-300">{item.storeName}</span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs text-slate-300">
                    ₹{item.subtotal.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    ₹{item.tax.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs font-extrabold text-white">
                    ₹{item.grandTotal.toFixed(2)}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
