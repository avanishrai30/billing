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
  const [isMobileLayout, setIsMobileLayout] = React.useState(false);
  const validPurchases = purchases.filter((p) => p.status !== 'VOIDED');

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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <h3 className="text-sm font-semibold text-slate-950 tracking-tight">
          Inward Supply & Input Tax Credit (ITC) Ledger
        </h3>
        <span className="text-xs text-slate-500 font-mono tabular-nums">
          {validPurchases.length} purchase entries
        </span>
      </div>

      {isMobileLayout && (
      <div className="divide-y divide-slate-100">
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
            <div key={p._id || p.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs font-semibold text-blue-700">{p.purchaseId || p.id}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{dateStr}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">Grand Total</div>
                  <div className="font-mono text-sm font-semibold text-slate-950 tabular-nums">₹{grandTotal.toFixed(2)}</div>
                </div>
              </div>
              <div className="text-xs font-medium text-slate-900">{p.supplierName || 'Vendor'}</div>
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-[11px]">
                <div>
                  <div className="text-slate-500">Taxable</div>
                  <div className="font-mono font-semibold text-slate-900 tabular-nums">₹{subtotal.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Freight</div>
                  <div className="font-mono font-semibold text-slate-700 tabular-nums">₹{shipping.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-slate-500">ITC</div>
                  <div className="font-mono font-semibold text-amber-700 tabular-nums">₹{taxAmount.toFixed(2)}</div>
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
                    <span className="font-mono text-xs font-semibold text-blue-700">
                      {p.purchaseId || p.id}
                    </span>
                    <span className="text-[10px] text-slate-500">{dateStr}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-xs font-medium text-slate-900 truncate max-w-[150px] block">
                    {p.supplierName || 'Vendor'}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs text-slate-700">
                    ₹{subtotal.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs text-slate-700">
                    ₹{shipping.toFixed(2)}
                  </span>
                </TableCell>

                <TableCell isNumeric>
                  <span className="font-mono text-xs font-semibold text-amber-700">
                    ₹{taxAmount.toFixed(2)}
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
