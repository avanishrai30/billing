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
  const franchiseMap = React.useMemo(() => {
    const map = new Map<string, FranchiseDoc>();
    for (const f of franchises) {
      map.set(f.id, f);
    }
    return map;
  }, [franchises]);

  if (isLoading) {
    return (
      <div className="bg-[#021b47] border border-white/10 rounded-2xl p-6 text-center text-slate-400 text-sm">
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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#021b47]">
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
              : '—';

            return (
              <TableRow key={order.id}>
                {/* Order Details */}
                <TableCell>
                  <div className="font-mono font-bold text-xs text-white">{order.id}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {formattedDate}
                  </div>
                </TableCell>

                {/* Target Franchise */}
                <TableCell>
                  <div className="font-semibold text-white text-xs truncate max-w-[180px]" title={fran?.name || order.franchiseId}>
                    {fran?.name || order.franchiseId}
                  </div>
                  {fran?.location && (
                    <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                      {fran.location}
                    </div>
                  )}
                </TableCell>

                {/* Line Items */}
                <TableCell isNumeric>
                  <span className="font-mono text-xs text-slate-300">
                    {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                  </span>
                </TableCell>

                {/* Subtotal */}
                <TableCell isNumeric>
                  <span className="font-mono text-xs text-slate-300">
                    ₹{Number(order.subtotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </TableCell>

                {/* GST Tax */}
                <TableCell isNumeric>
                  <span className="font-mono text-xs text-amber-400">
                    ₹{Number(order.tax || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </TableCell>

                {/* Grand Total */}
                <TableCell isNumeric>
                  <span className="font-mono font-bold text-xs text-emerald-400">
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
                  <span className="text-xs text-slate-400 truncate max-w-[140px] block" title={order.notes || ''}>
                    {order.notes || '—'}
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
