'use client';

import React from 'react';
import { History, SlidersHorizontal, ArrowLeftRight, PackageOpen } from 'lucide-react';
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
  IconButton
} from '../../../components/ui';
import {
  calculateAvailableStock,
  deriveStockStatus,
  calculateStockValuation
} from '../calculations';
import type { InventoryBalance, StockStatus } from '../types';

export interface InventoryTableProps {
  balances: InventoryBalance[];
  isLoading: boolean;
  canAdjust?: boolean;
  canTransfer?: boolean;
  onViewLedger: (item: InventoryBalance) => void;
  onAdjustStock: (item: InventoryBalance) => void;
  onTransferStock: (item: InventoryBalance) => void;
  onClearFilters?: () => void;
  isFiltered?: boolean;
}

export function InventoryTable({
  balances,
  isLoading,
  canAdjust = false,
  canTransfer = false,
  onViewLedger,
  onAdjustStock,
  onTransferStock,
  onClearFilters,
  isFiltered = false
}: InventoryTableProps) {
  if (isLoading) {
    return (
      <div className="bg-[#021b47] border border-white/10 rounded-2xl p-4 space-y-3">
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

  if (balances.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen className="w-8 h-8 text-slate-400" />}
        title={isFiltered ? 'No Matching Stock Records' : 'No Inventory Balances'}
        description={
          isFiltered
            ? 'No inventory items match your selected filters. Try searching for a different product or clearing filters.'
            : 'No stock records found for this location. Stock inwarded via Purchases will appear here.'
        }
        actionLabel={isFiltered ? 'Reset Filters' : undefined}
        onAction={isFiltered ? onClearFilters : undefined}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#021b47]">
      <Table density="dense">
        <TableHeader>
          <tr>
            <TableHead>Product Details</TableHead>
            <TableHead>Outlet</TableHead>
            <TableHead isNumeric>Current Stock</TableHead>
            <TableHead isNumeric>Reserved</TableHead>
            <TableHead isNumeric>Available</TableHead>
            <TableHead isNumeric>Reorder Lvl</TableHead>
            <TableHead align="center">Status</TableHead>
            <TableHead isNumeric>Asset Value</TableHead>
            <TableHead align="right">Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {balances.map((item) => {
            const avail = calculateAvailableStock(item.quantity, item.reservedQuantity);
            const status: StockStatus = deriveStockStatus(item.quantity, item.reorderLevel);
            const val = calculateStockValuation(item.quantity, item.cost || 0);

            return (
              <TableRow key={`${item.productId}-${item.locationId}`}>
                {/* Product Details */}
                <TableCell>
                  <div className="font-semibold text-white truncate max-w-[220px]" title={item.productName || item.productId}>
                    {item.productName || item.productId}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="font-mono">{item.sku || 'No SKU'}</span>
                    {item.category && <span>• {item.category}</span>}
                  </div>
                </TableCell>

                {/* Outlet */}
                <TableCell>
                  <span className="text-xs text-slate-300 font-mono">
                    {item.locationId === 'all' ? 'All Stores' : item.locationId}
                  </span>
                </TableCell>

                {/* Current Stock */}
                <TableCell isNumeric>
                  <span className="font-bold text-white text-xs">
                    {Number(item.quantity ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} {item.unit || 'units'}
                  </span>
                </TableCell>

                {/* Reserved */}
                <TableCell isNumeric>
                  <span className="text-slate-400 text-xs">
                    {Number(item.reservedQuantity ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </TableCell>

                {/* Available */}
                <TableCell isNumeric>
                  <span className="font-bold text-emerald-400 text-xs">
                    {Number(avail ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </TableCell>

                {/* Reorder Level */}
                <TableCell isNumeric>
                  <span className="text-slate-400 text-xs">
                    {item.reorderLevel}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell align="center">
                  {status === 'OUT_OF_STOCK' ? (
                    <Badge variant="danger" size="sm" dot>
                      Out of Stock
                    </Badge>
                  ) : status === 'LOW_STOCK' ? (
                    <Badge variant="warning" size="sm" dot>
                      Low Stock
                    </Badge>
                  ) : (
                    <Badge variant="success" size="sm" dot>
                      In Stock
                    </Badge>
                  )}
                </TableCell>

                {/* Valuation */}
                <TableCell isNumeric>
                  <span className="font-semibold text-slate-200 text-xs">
                    ₹ {val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell align="right">
                  <div className="flex items-center justify-end gap-1.5">
                    <IconButton
                      aria-label={`View movement history for ${item.productName || item.productId}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewLedger(item)}
                      icon={<History className="w-3.5 h-3.5 text-sky-400" />}
                    />
                    {canAdjust && (
                      <IconButton
                        aria-label={`Adjust stock for ${item.productName || item.productId}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => onAdjustStock(item)}
                        icon={<SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />}
                      />
                    )}
                    {canTransfer && (
                      <IconButton
                        aria-label={`Transfer stock for ${item.productName || item.productId}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => onTransferStock(item)}
                        icon={<ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />}
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
  );
}
