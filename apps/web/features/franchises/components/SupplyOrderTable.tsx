'use client';

import React from 'react';
import { Calendar, Package, Clock, CheckCircle2 } from 'lucide-react';
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
import type { FranchiseSupplyOrderDoc, FranchiseDoc } from '../types';

export interface SupplyOrderTableProps {
  orders: FranchiseSupplyOrderDoc[];
  franchises: FranchiseDoc[];
  isLoading: boolean;
  onClearFilters?: () => void;
}

export function SupplyOrderTable({
  orders,
  franchises,
  isLoading,
  onClearFilters
}: SupplyOrderTableProps) {
  const [isMobileLayout, setIsMobileLayout] = React.useState(false);

  React.useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncLayout = () => setIsMobileLayout(mediaQuery.matches);

    syncLayout();
    mediaQuery.addEventListener('change', syncLayout);
    return () => mediaQuery.removeEventListener('change', syncLayout);
  }, []);

  const franchiseMap = React.useMemo(() => {
    const map = new Map<string, FranchiseDoc>();
    for (const f of franchises) {
      map.set(f.id, f);
    }
    return map;
  }, [franchises]);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-sm shadow-xs">
        Loading supply order ledger...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Package className="w-8 h-8 text-slate-400" />}
        title="No Supply Orders Recorded"
        description="Outbound wholesale supply dispatches to franchise partners will appear here."
        actionLabel={onClearFilters ? 'Reset Filters' : undefined}
        onAction={onClearFilters}
      />
    );
  }

  return (
    <>
      {isMobileLayout && (
      <div className="space-y-3">
        {orders.map((order) => {
          const fran = franchiseMap.get(order.franchiseId);
          const formattedDate = order.date || order.createdAt
            ? new Date(order.date || order.createdAt).toLocaleDateString('en-IN')
            : 'N/A';

          return (
            <article key={order.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono font-bold text-xs text-slate-900 truncate">{order.id}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {formattedDate}
                  </div>
                </div>
                {order.paymentStatus === 'paid' ? (
                  <Badge variant="success" size="sm" dot>
                    PAID
                  </Badge>
                ) : order.paymentStatus === 'credit' ? (
                  <Badge variant="warning" size="sm" dot>
                    CREDIT
                  </Badge>
                ) : order.paymentStatus === 'pending' ? (
                  <Badge variant="warning" size="sm" dot>
                    PENDING
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm" dot>
                    UNPAID
                  </Badge>
                )}
              </div>

              <div className="mt-3 text-xs text-slate-700">
                <div className="font-semibold text-slate-900 truncate" title={fran?.name || order.franchiseId}>
                  {fran?.name || order.franchiseId}
                </div>
                {fran?.location && <div className="text-[11px] text-slate-500 truncate">{fran.location}</div>}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div>
                  <span className="block text-slate-500">Items</span>
                  <span className="font-mono text-slate-900">{order.items?.length || 0}</span>
                </div>
                <div>
                  <span className="block text-slate-500">Subtotal</span>
                  <span className="font-mono text-slate-900">
                    ₹{Number(order.subtotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500">GST Tax</span>
                  <span className="font-mono text-amber-700">
                    ₹{Number(order.tax || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500">Grand Total</span>
                  <span className="font-mono font-bold text-emerald-700">
                    ₹{Number(order.grandTotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {order.notes && (
                <p className="mt-3 text-[11px] text-slate-600 line-clamp-2">{order.notes}</p>
              )}
            </article>
          );
        })}
      </div>
      )}

      {!isMobileLayout && (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <Table density="dense">
        <TableHeader>
          <tr>
            <TableHead>Order Details</TableHead>
            <TableHead>Target Franchise</TableHead>
            <TableHead isNumeric>Line Items</TableHead>
            <TableHead isNumeric>Subtotal</TableHead>
            <TableHead isNumeric>GST Tax</TableHead>
            <TableHead isNumeric>Grand Total</TableHead>
            <TableHead align="center">Payment Status</TableHead>
            <TableHead>Notes</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const fran = franchiseMap.get(order.franchiseId);
            const formattedDate = order.date || order.createdAt
              ? new Date(order.date || order.createdAt).toLocaleDateString('en-IN')
              : 'N/A';

            return (
              <TableRow key={order.id}>
                {/* Order Details */}
                <TableCell>
                  <div className="font-mono font-bold text-xs text-slate-900">{order.id}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {formattedDate}
                  </div>
                </TableCell>

                {/* Target Franchise */}
                <TableCell>
                  <div className="font-semibold text-slate-900 text-xs truncate max-w-[180px]" title={fran?.name || order.franchiseId}>
                    {fran?.name || order.franchiseId}
                  </div>
                  {fran?.location && (
                    <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                      {fran.location}
                    </div>
                  )}
                </TableCell>

                {/* Line Items */}
                <TableCell isNumeric>
                  <span className="font-mono text-xs text-slate-700">
                    {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                  </span>
                </TableCell>

                {/* Subtotal */}
                <TableCell isNumeric>
                  <span className="font-mono text-xs text-slate-700">
                    ₹{Number(order.subtotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </TableCell>

                {/* GST Tax */}
                <TableCell isNumeric>
                  <span className="font-mono text-xs text-amber-700">
                    ₹{Number(order.tax || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </TableCell>

                {/* Grand Total */}
                <TableCell isNumeric>
                  <span className="font-mono font-bold text-xs text-emerald-700">
                    ₹{Number(order.grandTotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </TableCell>

                {/* Payment Status */}
                <TableCell align="center">
                  {order.paymentStatus === 'paid' ? (
                    <Badge variant="success" size="sm" dot>
                      PAID
                    </Badge>
                  ) : order.paymentStatus === 'credit' ? (
                    <Badge variant="warning" size="sm" dot>
                      CREDIT
                    </Badge>
                  ) : order.paymentStatus === 'pending' ? (
                    <Badge variant="warning" size="sm" dot>
                      PENDING
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm" dot>
                      UNPAID
                    </Badge>
                  )}
                </TableCell>

                {/* Notes */}
                <TableCell>
                  <span className="text-xs text-slate-600 truncate max-w-[140px] block" title={order.notes || ''}>
                    {order.notes || 'N/A'}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
      )}
    </>
  );
}
