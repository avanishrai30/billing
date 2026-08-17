'use client';

import React from 'react';
import { Eye, Download, Ban, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  EmptyState,
  Skeleton,
  IconButton,
  Button
} from '../../../components/ui';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { getPaymentModeBadgeConfig, formatInvoiceNumber } from '../calculations';
import { invoicesApi } from '../api';
import type { Invoice } from '../types';

export interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  canVoid?: boolean;
  onViewDetail: (invoice: Invoice) => void;
  onVoidInvoice: (invoice: Invoice) => void;
  onClearFilters?: () => void;
  isFiltered?: boolean;
  pagination: {
    page: number;
    limit?: number;
    totalPages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  onPageChange: (newPage: number) => void;
}

export function InvoiceTable({
  invoices,
  isLoading,
  canVoid = false,
  onViewDetail,
  onVoidInvoice,
  onClearFilters,
  isFiltered = false,
  pagination,
  onPageChange
}: InvoiceTableProps) {
  if (isLoading) {
    return (
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 py-2">
            <Skeleton variant="text" className="w-1/4 h-5" />
            <Skeleton variant="text" className="w-1/6 h-5" />
            <Skeleton variant="text" className="w-1/8 h-5" />
            <Skeleton variant="rectangular" className="w-20 h-6 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<FileSpreadsheet className="w-8 h-8 text-slate-400" />}
        title={isFiltered ? 'No Matching Invoices Found' : 'No Sales Invoices Recorded'}
        description={
          isFiltered
            ? 'No invoices match your selected search terms or filters. Try adjusting your query.'
            : 'There are currently zero sales invoices generated in this store outlet.'
        }
        actionLabel={isFiltered ? 'Reset Filters' : undefined}
        onAction={isFiltered ? onClearFilters : undefined}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a]">
        <Table density="dense">
          <TableHeader>
            <tr>
              <TableHead>Invoice # & Date</TableHead>
              <TableHead>Customer Details</TableHead>
              <TableHead>Store Outlet</TableHead>
              <TableHead align="center">Items</TableHead>
              <TableHead isNumeric>Tax (GST)</TableHead>
              <TableHead isNumeric>Grand Total</TableHead>
              <TableHead align="center">Payment Mode</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => {
              const invoiceNo = formatInvoiceNumber(inv);
              const isVoided = inv.status === 'VOIDED' || inv.isArchived;
              const payConfig = getPaymentModeBadgeConfig(inv.paymentMode || inv.paymentMethod);
              const itemCount = inv.items?.length || 0;
              const dateDisplay = inv.createdAt
                ? new Date(inv.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })
                : 'N/A';

              const grandTotal = Number(inv.grandTotal ?? inv.grandtotal ?? 0);
              const tax = Number(inv.tax ?? 0);

              return (
                <TableRow
                  key={inv.id || inv._id || invoiceNo}
                  className={isVoided ? 'opacity-60 bg-rose-500/[0.02]' : ''}
                >
                  {/* Invoice # & Date */}
                  <TableCell>
                    <div className="font-mono font-bold text-white text-xs">
                      {invoiceNo}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {dateDisplay}
                    </div>
                  </TableCell>

                  {/* Customer Details */}
                  <TableCell>
                    <div className="font-semibold text-slate-200 text-xs truncate max-w-[180px]">
                      {inv.customerName || 'Walk-in Customer'}
                    </div>
                    {inv.customerPhone && (
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                        {inv.customerPhone}
                      </div>
                    )}
                  </TableCell>

                  {/* Outlet */}
                  <TableCell>
                    <span className="text-xs text-slate-300 font-mono">
                      {inv.locationId || inv.storeId || 'All Stores'}
                    </span>
                  </TableCell>

                  {/* Item Count */}
                  <TableCell align="center">
                    <Badge variant="neutral" size="sm">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </Badge>
                  </TableCell>

                  {/* Tax */}
                  <TableCell isNumeric>
                    <span className="text-slate-300 text-xs tabular-nums">
                      ₹ {tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </TableCell>

                  {/* Grand Total */}
                  <TableCell isNumeric>
                    <span className="font-mono font-bold text-white text-xs tabular-nums">
                      ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </TableCell>

                  {/* Payment Mode */}
                  <TableCell align="center">
                    <Badge variant={payConfig.variant} size="sm">
                      {payConfig.label}
                    </Badge>
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell align="center">
                    <InvoiceStatusBadge status={inv.status} isArchived={inv.isArchived} />
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-1.5">
                      <IconButton
                        aria-label={`View details for invoice ${invoiceNo}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetail(inv)}
                        icon={<Eye className="w-3.5 h-3.5 text-sky-400" />}
                      />
                      <a
                        href={invoicesApi.getPdfUrl(invoiceNo)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex"
                      >
                        <IconButton
                          aria-label={`Download PDF for invoice ${invoiceNo}`}
                          variant="ghost"
                          size="sm"
                          icon={<Download className="w-3.5 h-3.5 text-slate-300" />}
                        />
                      </a>
                      {canVoid && !isVoided && (
                        <IconButton
                          aria-label={`Void invoice ${invoiceNo}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => onVoidInvoice(inv)}
                          icon={<Ban className="w-3.5 h-3.5 text-rose-400" />}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Server Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-400">
          <div>
            Showing Page <strong className="text-white">{pagination.page}</strong> of{' '}
            <strong className="text-white">{pagination.totalPages}</strong> ({pagination.total} total records)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => onPageChange(pagination.page - 1)}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => onPageChange(pagination.page + 1)}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
