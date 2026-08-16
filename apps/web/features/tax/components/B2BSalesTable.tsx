'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  EmptyState
} from '../../../components/ui';
import type { B2BInvoiceEntry } from '../types';

export interface B2BSalesTableProps {
  entries: B2BInvoiceEntry[];
  isLoading: boolean;
}

export function B2BSalesTable({ entries, isLoading }: B2BSalesTableProps) {
  if (isLoading) {
    return (
      <div className="bg-[#021b47] border border-white/10 rounded-2xl p-6 text-center text-slate-400 text-sm">
        Loading B2B registered sales...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="w-8 h-8 text-slate-400" />}
        title="No B2B Registered Sales"
        description="Invoices issued to business customers with verified GSTIN numbers will appear here."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#021b47]">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white tracking-tight">
          B2B Registered Invoices (Verified GSTIN)
        </h3>
        <span className="text-xs text-sky-400 font-mono font-bold">
          {entries.length} B2B Invoices
        </span>
      </div>

      <Table density="dense">
        <TableHeader>
          <tr>
            <TableHead>Invoice # & Date</TableHead>
            <TableHead>Client & GSTIN</TableHead>
            <TableHead>Store Branch</TableHead>
            <TableHead isNumeric>Taxable Value</TableHead>
            <TableHead isNumeric>CGST (50%)</TableHead>
            <TableHead isNumeric>SGST (50%)</TableHead>
            <TableHead isNumeric>Total GST</TableHead>
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
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                      {item.customerName}
                    </span>
                    <code className="text-[10px] font-mono text-sky-300 bg-black/30 px-1 py-0.5 rounded border border-white/5 w-fit">
                      {item.gstin}
                    </code>
                  </div>
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
                  <span className="font-mono text-xs text-amber-300">
                    ₹{item.cgst.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs text-emerald-300">
                    ₹{item.sgst.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs font-bold text-sky-400">
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
