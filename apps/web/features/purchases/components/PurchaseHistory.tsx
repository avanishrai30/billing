'use client';

import React, { useState } from 'react';
import { Search, Eye, Ban, Truck } from 'lucide-react';
import {
  Card,
  SectionHeader,
  Input,
  Select,
  Button,
  IconButton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  StatusBadge,
  Badge,
  Pagination,
  EmptyState,
  LoadingState
} from '../../../components/ui';
import { usePurchasesQuery } from '../hooks';
import type { PurchaseDoc } from '../types';

export interface PurchaseHistoryProps {
  onSelectPurchase: (purchase: PurchaseDoc) => void;
  onRequestVoid: (purchase: PurchaseDoc) => void;
}

export function PurchaseHistory({
  onSelectPurchase,
  onRequestVoid
}: PurchaseHistoryProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filterParams = {
    page,
    limit: pageSize,
    status: statusFilter !== 'ALL' ? statusFilter : undefined
  };

  const { data, isLoading, isError, refetch } = usePurchasesQuery(filterParams);

  const purchases = data?.purchases || [];
  const pagination = data?.pagination || {
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  };

  // Client-side search refinement for supplier or invoice number
  const filteredPurchases = purchases.filter((p) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const sup = (p.supplierName || '').toLowerCase();
    const inv = (p.invoiceNumber || '').toLowerCase();
    const num = (p.purchaseId || p.id || '').toLowerCase();
    const ref = (p.reference || '').toLowerCase();
    return sup.includes(query) || inv.includes(query) || num.includes(query) || ref.includes(query);
  });

  return (
    <Card variant="default">
      <SectionHeader
        title="Procurement Inward Register & Ledger"
        subtitle="Server-paginated procurement history, vendor billing records, and stock batch tracking"
        action={
          <div className="flex items-center gap-3">
            <div className="w-56">
              <Input
                placeholder="Search vendor, bill #..."
                leftIcon={<Search className="w-3.5 h-3.5" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-36">
              <Select
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'RECEIVED', label: 'Received' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'ORDERED', label: 'Ordered' },
                  { value: 'VOIDED', label: 'Voided' }
                ]}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        }
      />

      {isLoading ? (
        <LoadingState message="Fetching procurement ledger batches from server..." />
      ) : isError ? (
        <EmptyState
          title="Unable to load procurement records"
          description="A network or gateway error occurred while retrieving purchase history."
          actionLabel="Retry Query"
          onAction={() => refetch()}
        />
      ) : filteredPurchases.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-6 h-6 text-slate-400" />}
          title="No Procurement Records Found"
          description={
            search || statusFilter !== 'ALL'
              ? 'No purchase records match the selected search or status filters.'
              : 'There are currently zero inward purchase records recorded in the system.'
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
            <Table density="dense">
              <TableHeader>
                <tr>
                  <TableHead>PO / Inward #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Bill / Invoice #</TableHead>
                  <TableHead>Store Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead isNumeric>Grand Total</TableHead>
                  <TableHead align="right">Date</TableHead>
                  <TableHead align="center">Actions</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => {
                  const poNum = purchase.purchaseId || purchase.id;
                  const isVoided = purchase.status === 'VOIDED' || purchase.isArchived;
                  const grandTotal = purchase.grandTotal || 0;
                  const dateStr = purchase.purchaseDate
                    ? new Date(purchase.purchaseDate).toLocaleDateString()
                    : 'N/A';

                  return (
                    <TableRow key={purchase.id || purchase._id} className={isVoided ? 'opacity-60 bg-rose-50' : ''}>
                      <TableCell className="font-mono font-medium text-slate-900 text-xs">
                        {poNum}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {purchase.supplierName || 'General Supplier'}
                      </TableCell>
                      <TableCell className="font-mono text-slate-700 text-xs">
                        {purchase.invoiceNumber || 'N/A'}
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">
                        {purchase.locationId || purchase.storeId || 'All'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={purchase.status || 'RECEIVED'} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            purchase.paymentStatus === 'PAID'
                              ? 'success'
                              : purchase.paymentStatus === 'PARTIALLY_PAID'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {purchase.paymentStatus || 'PAID'}
                        </Badge>
                      </TableCell>
                      <TableCell isNumeric className="font-mono font-bold text-emerald-700 tabular-nums">
                        ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right" className="font-mono text-slate-500 text-xs">
                        {dateStr}
                      </TableCell>
                      <TableCell align="center">
                        <div className="flex items-center justify-center gap-1">
                          <IconButton
                            aria-label={`View details for ${poNum}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectPurchase(purchase)}
                            icon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                          />
                          {!isVoided && (
                            <IconButton
                              aria-label={`Void purchase ${poNum}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => onRequestVoid(purchase)}
                              icon={<Ban className="w-3.5 h-3.5 text-rose-600" />}
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

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      )}
    </Card>
  );
}
