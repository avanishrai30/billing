'use client';

import React from 'react';
import { ShoppingCart } from 'lucide-react';
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
import type { RecentInvoice } from '../types';

export interface RecentSalesTableProps {
  invoices: RecentInvoice[];
}

export function RecentSalesTable({ invoices }: RecentSalesTableProps) {
  return (
    <Card variant="default">
      <SectionHeader
        title="Recent Sales Invoices"
        subtitle="Latest point-of-sale customer transactions"
      />

      {invoices.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="w-6 h-6 text-slate-400" />}
          title="No Invoices Recorded"
          description="There are no completed sales transactions in this store scope."
        />
      ) : (
        <Table density="dense">
          <TableHeader>
            <tr>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead isNumeric>Grand Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead align="right">Timestamp</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {invoices.map((inv, idx) => {
              const invNum = inv.invoiceNumber || inv.invoicenumber || `INV-${idx + 1}`;
              const amount = inv.grandTotal ?? inv.grandtotal ?? 0;
              const dateStr = inv.createdAt
                ? new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Just now';

              return (
                <TableRow key={inv._id || inv.id || invNum}>
                  <TableCell className="font-mono text-white font-medium text-xs">
                    {invNum}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {inv.customerName || 'Walk-in Retail Customer'}
                  </TableCell>
                  <TableCell isNumeric className="font-semibold text-emerald-400">
                    ₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={inv.status || 'paid'} />
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
