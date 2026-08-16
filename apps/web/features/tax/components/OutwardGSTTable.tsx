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
  const validInvoices = invoices.filter((i) => i.status !== 'VOIDED');

  if (isLoading) {
    return (
      <div className="bg-[#021b47] border border-white/10 rounded-2xl p-6 text-center text-slate-400 text-sm">
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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#021b47]">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white tracking-tight">
          Outward GST Supply Ledger (Sales Invoices)
        </h3>
        <span className="text-xs text-slate-400 font-mono">
          {validInvoices.length} transactions recorded
        </span>
      </div>

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
                    <span className="font-mono text-xs font-bold text-sky-400">
                      {inv.invoiceNumber || inv.id}
                    </span>
                    <span className="text-[10px] text-slate-400">{dateStr}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-xs font-medium text-white truncate max-w-[140px] block">
                    {inv.customerName || 'Retail Customer'}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs text-slate-300">
                    ₹{subtotal.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    ₹{tax.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs text-amber-300">
                    ₹{cgst.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs text-emerald-300">
                    ₹{sgst.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs font-extrabold text-white">
                    ₹{grandTotal.toFixed(2)}
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
