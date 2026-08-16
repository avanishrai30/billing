'use client';

import React from 'react';
import { Truck } from 'lucide-react';
import {
  Card,
  SectionHeader,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  StatusBadge,
  EmptyState
} from '../../../components/ui';
import type { RecentPurchase } from '../types';

export interface RecentPurchasesTableProps {
  purchases: RecentPurchase[];
}

export function RecentPurchasesTable({ purchases }: RecentPurchasesTableProps) {
  return (
    <Card variant="default">
      <SectionHeader
        title="Recent Inward Purchases"
        subtitle="Procurement supplier orders and stock batch arrivals"
      />

      {purchases.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-6 h-6 text-slate-400" />}
          title="No Purchases Recorded"
          description="There are no supplier procurement records in this store scope."
        />
      ) : (
        <Table density="dense">
          <TableHeader>
            <tr>
              <TableHead>PO / Bill #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead isNumeric>Order Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead align="right">Timestamp</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {purchases.map((po, idx) => {
              const poNum = po.purchaseNumber || po.purchasenumber || `PO-${idx + 1}`;
              const amount = po.grandTotal ?? po.grandtotal ?? po.total ?? 0;
              const dateStr = po.createdAt
                ? new Date(po.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Recent';

              return (
                <TableRow key={po._id || po.id || poNum}>
                  <TableCell className="font-mono text-white font-medium text-xs">
                    {poNum}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {po.supplierName || 'General Dairy Supplier'}
                  </TableCell>
                  <TableCell isNumeric className="font-semibold text-sky-400">
                    ₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={po.status || 'received'} />
                  </TableCell>
                  <TableCell align="right" className="font-mono text-slate-400 text-[11px]">
                    {dateStr}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
