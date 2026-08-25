'use client';

import React from 'react';
import {
  CheckSquare,
  Square,
  AlertTriangle,
  Archive,
  RotateCcw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Boxes,
  Package,
  Truck
} from 'lucide-react';
import { Button, Badge, Skeleton } from '../../../components/ui';
import type { CleanupDomain, CleanupAction } from '../types';

export interface CleanupDataTableProps {
  domain: CleanupDomain;
  records: any[];
  isLoading: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  page: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (newPage: number) => void;
  onTriggerAction: (action: CleanupAction, singleId?: string) => void;
}

export function CleanupDataTable({
  domain,
  records,
  isLoading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  isAllSelected,
  page,
  totalPages,
  totalRecords,
  onPageChange,
  onTriggerAction
}: CleanupDataTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
        <p className="text-sm font-medium text-slate-700">No records found matching current criteria.</p>
        <p className="text-xs text-slate-400 mt-1">Try adjusting the search query, date filter, or status selector above.</p>
      </div>
    );
  }

  const selectedCount = selectedIds.length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
      {/* Top Action Toolbar for Bulk Selection */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            {isAllSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : selectedCount > 0 ? (
              <CheckSquare className="w-4 h-4 text-slate-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>Select Page ({records.length})</span>
          </button>

          {selectedCount > 0 && (
            <Badge variant="brand" size="sm">
              {selectedCount} Selected
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {domain === 'invoices' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onTriggerAction('archive')}
                disabled={selectedCount === 0}
                className="text-xs flex items-center gap-1"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive Selected
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onTriggerAction('void')}
                disabled={selectedCount === 0}
                className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Void & Revert Stock
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onTriggerAction('purge')}
                disabled={selectedCount === 0}
                className="text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Purge Test Records
              </Button>
            </>
          )}

          {domain === 'purchases' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onTriggerAction('archive')}
                disabled={selectedCount === 0}
                className="text-xs flex items-center gap-1"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive Selected
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onTriggerAction('void')}
                disabled={selectedCount === 0}
                className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Void & Deduct Stock
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onTriggerAction('purge')}
                disabled={selectedCount === 0}
                className="text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Purge Test Purchases
              </Button>
            </>
          )}

          {domain === 'products' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onTriggerAction('archive')}
                disabled={selectedCount === 0}
                className="text-xs flex items-center gap-1"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive Selected
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onTriggerAction('restore')}
                disabled={selectedCount === 0}
                className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Selected
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onTriggerAction('purge')}
                disabled={selectedCount === 0}
                className="text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Purge Unreferenced
              </Button>
            </>
          )}

          {domain === 'inventory' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onTriggerAction('reset_test_stock')}
                disabled={selectedCount === 0}
                className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Stock to 0
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onTriggerAction('remove_orphans')}
                disabled={selectedCount === 0}
                className="text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Orphan Inventory Cleanup
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <th className="p-3 w-10 text-center">
                <span className="sr-only">Select</span>
              </th>
              {domain === 'invoices' && (
                <>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Store</th>
                  <th className="p-3 text-right">Items</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-center">Status</th>
                </>
              )}
              {domain === 'purchases' && (
                <>
                  <th className="p-3">Purchase #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Store</th>
                  <th className="p-3 text-right">Items</th>
                  <th className="p-3 text-right">Total Amount</th>
                  <th className="p-3 text-center">Status</th>
                </>
              )}
              {domain === 'products' && (
                <>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Barcode</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Retail Price</th>
                  <th className="p-3 text-center">Status</th>
                </>
              )}
              {domain === 'inventory' && (
                <>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Store</th>
                  <th className="p-3 text-right">Current Stock</th>
                  <th className="p-3 text-center">Status</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((r) => {
              const isSelected = selectedIds.includes(r.id);
              return (
                <tr
                  key={r.id}
                  className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}
                >
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(r.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>

                  {domain === 'invoices' && (
                    <>
                      <td className="p-3 font-mono font-semibold text-slate-900">{r.invoiceNumber || r.id}</td>
                      <td className="p-3 text-slate-600">{r.date ? new Date(r.date).toLocaleDateString('en-IN') : 'N/A'}</td>
                      <td className="p-3 text-slate-800">{r.customerName || 'Walk-in'}</td>
                      <td className="p-3 text-slate-600">{r.locationId || r.storeId || 'All'}</td>
                      <td className="p-3 text-right font-mono">{r.itemCount}</td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-950">
                        ₹{(r.total || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center">
                        {r.status === 'VOIDED' ? (
                          <Badge variant="danger" size="sm">VOIDED</Badge>
                        ) : r.isArchived ? (
                          <Badge variant="neutral" size="sm">ARCHIVED</Badge>
                        ) : (
                          <Badge variant="success" size="sm">POSTED</Badge>
                        )}
                      </td>
                    </>
                  )}

                  {domain === 'purchases' && (
                    <>
                      <td className="p-3 font-mono font-semibold text-slate-900">{r.purchaseId || r.id}</td>
                      <td className="p-3 text-slate-600">{r.date ? new Date(r.date).toLocaleDateString('en-IN') : 'N/A'}</td>
                      <td className="p-3 text-slate-800">{r.supplierName || 'N/A'}</td>
                      <td className="p-3 text-slate-600">{r.locationId || r.storeId || 'All'}</td>
                      <td className="p-3 text-right font-mono">{r.itemCount}</td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-950">
                        ₹{(r.total || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center">
                        {r.status === 'VOIDED' ? (
                          <Badge variant="danger" size="sm">VOIDED</Badge>
                        ) : r.isArchived ? (
                          <Badge variant="neutral" size="sm">ARCHIVED</Badge>
                        ) : (
                          <Badge variant="success" size="sm">ACTIVE</Badge>
                        )}
                      </td>
                    </>
                  )}

                  {domain === 'products' && (
                    <>
                      <td className="p-3 font-semibold text-slate-900">{r.name}</td>
                      <td className="p-3 font-mono text-slate-600">{r.sku}</td>
                      <td className="p-3 font-mono text-slate-500">{r.barcode || '—'}</td>
                      <td className="p-3 text-slate-700">{r.category || 'General'}</td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-950">
                        ₹{(r.sellingPrice || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center">
                        {r.isArchived ? (
                          <Badge variant="neutral" size="sm">ARCHIVED</Badge>
                        ) : (
                          <Badge variant="success" size="sm">ACTIVE</Badge>
                        )}
                      </td>
                    </>
                  )}

                  {domain === 'inventory' && (
                    <>
                      <td className="p-3 font-semibold text-slate-900">
                        <div className="flex flex-col">
                          <span>{r.isOrphan ? 'Product Master Missing' : r.productName}</span>
                          {r.isOrphan && (
                            <span className="text-[11px] font-bold text-red-700">ORPHAN INVENTORY</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{r.isOrphan ? '—' : r.sku}</td>
                      <td className="p-3 text-slate-600">{r.locationId}</td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-950">
                        {r.currentQuantity}
                      </td>
                      <td className="p-3 text-center">
                        {r.isOrphan ? (
                          <Badge variant="danger" size="sm">ORPHAN</Badge>
                        ) : r.currentQuantity <= 0 ? (
                          <Badge variant="danger" size="sm">ZERO STOCK</Badge>
                        ) : (
                          <Badge variant="success" size="sm">IN STOCK</Badge>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between text-xs text-slate-600">
        <div>
          Showing page <strong className="text-slate-900">{page}</strong> of <strong className="text-slate-900">{totalPages || 1}</strong> ({totalRecords} total records)
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-1"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
