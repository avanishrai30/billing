'use client';

import React from 'react';
import { Truck } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  EmptyState
} from '../../../components/ui';
import type { PurchaseDoc } from '../../purchases/types';

export interface InwardGSTTableProps {
  purchases: PurchaseDoc[];
  isLoading: boolean;
}

export function InwardGSTTable({ purchases, isLoading }: InwardGSTTableProps) {
  const validPurchases = purchases.filter((p) => p.status !== 'VOIDED');

  if (isLoading) {
    return (
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 text-center text-slate-400 text-sm">
        Loading inward purchase GST ledger...
      </div>
    );
  }

  if (validPurchases.length === 0) {
    return (
      <EmptyState
        icon={<Truck className="w-8 h-8 text-slate-400" />}
        title="No Inward Purchases Recorded"
        description="Supplier purchases with Input Tax Credit (ITC) will appear in this ledger."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a]">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white tracking-tight">
          Inward Supply & Input Tax Credit (ITC) Ledger
        </h3>
        <span className="text-xs text-slate-400 font-mono">
          {validPurchases.length} purchase entries
        </span>
      </div>

      <Table density="dense">
        <TableHeader>
          <tr>
            <TableHead>Purchase ID / Date</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead isNumeric>Taxable Goods Base</TableHead>
            <TableHead isNumeric>Freight / Shipping</TableHead>
            <TableHead isNumeric>Inward GST (ITC)</TableHead>
            <TableHead isNumeric>Grand Total</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {validPurchases.map((p) => {
            const subtotal = Number(p.subtotal || 0);
            const shipping = Number(p.shipping || 0);
            const taxAmount = Number(p.taxAmount || 0);
            const grandTotal = Number(p.grandTotal || 0);

            const dateStr = p.createdAt
              ? new Date(p.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: '2-digit'
                })
              : 'N/A';

            return (
              <TableRow key={p._id || p.id}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs font-bold text-sky-400">
                      {p.purchaseId || p.id}
                    </span>
                    <span className="text-[10px] text-slate-400">{dateStr}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-xs font-medium text-white truncate max-w-[150px] block">
                    {p.supplierName || 'Vendor'}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs text-slate-300">
                    ₹{subtotal.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs text-slate-300">
                    ₹{shipping.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs font-bold text-amber-400">
                    ₹{taxAmount.toFixed(2)}
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
