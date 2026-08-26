'use client';

import React from 'react';
import {
  History,
  SlidersHorizontal,
  ArrowLeftRight,
  PackageOpen,
  Building2,
  Warehouse,
  AlertCircle,
  Clock,
  Eye
} from 'lucide-react';
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
import { deriveStockStatus, calculateStockValuation } from '../calculations';
import type {
  NetworkInventoryItem,
  CommandCenterStore,
  StockStatus
} from '../types';

export interface InventoryTableProps {
  items: NetworkInventoryItem[];
  selectedLocation: string; // 'network' | storeId
  stores: CommandCenterStore[];
  isLoading: boolean;
  canAdjust?: boolean;
  canTransfer?: boolean;
  onInspectItem: (item: NetworkInventoryItem) => void;
  onAdjustItem: (item: NetworkInventoryItem) => void;
  onTransferItem: (item: NetworkInventoryItem) => void;
  onClearFilters?: () => void;
  isFiltered?: boolean;
  catalogProducts?: number;
  stockedProducts?: number;
}

export function InventoryTable({
  items,
  selectedLocation,
  stores,
  isLoading,
  canAdjust = false,
  canTransfer = false,
  onInspectItem,
  onAdjustItem,
  onTransferItem,
  onClearFilters,
  isFiltered = false,
  catalogProducts = 0,
  stockedProducts = 0
}: InventoryTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
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

  if (items.length === 0) {
    const hasCatalogProducts = catalogProducts > 0 && !isFiltered;
    return (
      <EmptyState
        icon={<PackageOpen className="w-8 h-8 text-slate-400" />}
        title={isFiltered ? 'No Matching Stock Records' : (hasCatalogProducts ? `${catalogProducts.toLocaleString('en-IN')} products in catalog` : 'No Catalog Products')}
        description={
          isFiltered
            ? 'No inventory items match your selected search or filter criteria. Try resetting filters.'
            : hasCatalogProducts
              ? `${stockedProducts.toLocaleString('en-IN')} products currently stocked. Products are visible here from Product Master. Stock quantities appear after Purchases, Opening Stock, Stock Adjustments, or Transfers are recorded.`
              : 'No active Product Master SKUs are available for this inventory view.'
        }
        actionLabel={isFiltered ? 'Reset Filters' : undefined}
        onAction={isFiltered ? onClearFilters : undefined}
      />
    );
  }

  const isNetworkView = selectedLocation === 'network';
  const selectedStoreName = stores.find((s) => s.id === selectedLocation)?.name || selectedLocation;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <Table density="dense">
        <TableHeader>
          <tr>
            <TableHead>Product Identity</TableHead>
            <TableHead>{isNetworkView ? 'Location Breakdown' : 'Outlet'}</TableHead>
            <TableHead isNumeric>On Hand</TableHead>
            <TableHead isNumeric>Reserved</TableHead>
            <TableHead isNumeric>Available</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Batch / Expiry</TableHead>
            <TableHead align="center">Status</TableHead>
            <TableHead isNumeric>Asset Value</TableHead>
            <TableHead align="right">Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            // Determine on-hand and reserved based on view mode
            let onHand = item.networkQuantity;
            let reserved = item.networkReserved;
            let available = item.networkAvailable;

            if (!isNetworkView) {
              const loc = item.locationBreakdown.find((l) => l.locationId === selectedLocation);
              onHand = loc ? loc.quantity : 0;
              reserved = loc ? loc.reservedQuantity : 0;
              available = loc ? loc.available : 0;
            }

            const baseStatus: StockStatus = deriveStockStatus(onHand, item.reorderLevel);
            const val = calculateStockValuation(onHand, item.cost || 0);

            // Check if any batch is expiring soon
            const thirtyDaysIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            const hasExpiringBatch = item.batches.some(
              (b) => b.expiryDate && b.expiryDate <= thirtyDaysIso && b.remainingQuantity > 0
            );

            const displayStatus: StockStatus = hasExpiringBatch && baseStatus !== 'OUT_OF_STOCK'
              ? 'EXPIRING_SOON'
              : baseStatus;
            const identityLabel = item.isOrphan ? 'Product Master Missing' : item.productName;

            return (
              <TableRow
                key={item.productId}
                className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                onClick={() => onInspectItem(item)}
              >
                {/* Product Identity */}
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs truncate max-w-[200px]" title={item.productName}>
                        {identityLabel}
                      </span>
                      {item.isOrphan && (
                        <Badge variant="danger" size="sm">
                          ORPHAN INVENTORY
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      {item.isOrphan ? (
                        <span className="font-semibold text-red-700">Product Master Missing</span>
                      ) : (
                        <>
                          <span className="font-mono">{item.sku || 'No SKU'}</span>
                          {item.barcode && <span className="font-mono">• {item.barcode}</span>}
                          {item.category && <span>/ {item.category}</span>}
                        </>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Location Breakdown / Outlet */}
                <TableCell>
                  {isNetworkView ? (
                    <div className="flex flex-wrap items-center gap-1.5 max-w-[280px]">
                      {item.locationBreakdown.map((loc) => {
                        if (loc.quantity <= 0) return null;
                        return (
                          <span
                            key={loc.locationId}
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              loc.isWarehouse
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                            title={`${loc.locationName}: ${loc.quantity} on hand (${loc.available} avail)`}
                          >
                            {loc.isWarehouse ? (
                              <Warehouse className="w-2.5 h-2.5 text-amber-600" />
                            ) : (
                              <Building2 className="w-2.5 h-2.5 text-blue-600" />
                            )}
                            <span className="truncate max-w-[70px]">{loc.locationName}:</span>
                            <span className="font-mono font-bold">{loc.quantity}</span>
                          </span>
                        );
                      })}
                      {item.networkQuantity === 0 && (
                        <span className="text-[11px] text-slate-400 italic">No stock across network</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>{selectedStoreName}</span>
                    </div>
                  )}
                </TableCell>

                {/* On Hand */}
                <TableCell isNumeric>
                  <span className="font-bold text-slate-900 text-xs font-mono">
                    {Number(onHand ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </TableCell>

                {/* Reserved */}
                <TableCell isNumeric>
                  <span className="text-slate-500 text-xs font-mono">
                    {Number(reserved ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </TableCell>

                {/* Available */}
                <TableCell isNumeric>
                  <span className="font-bold text-emerald-700 text-xs font-mono">
                    {Number(available ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </TableCell>

                {/* Unit */}
                <TableCell>
                  <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                    {item.unit || 'units'}
                  </span>
                </TableCell>

                {/* Batch & Expiry */}
                <TableCell>
                  {item.batches && item.batches.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-mono font-semibold text-slate-800">
                        {item.batches[0].lotNumber}
                      </span>
                      {item.batches[0].expiryDate && (
                        <span className="text-[10px] text-slate-500">
                          EXP {new Date(item.batches[0].expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      {item.batches.length > 1 && (
                        <span className="text-[10px] font-bold text-blue-600">
                          +{item.batches.length - 1} more lots
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No Lot / General</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell align="center">
                  {item.isOrphan ? (
                    <Badge variant="danger" size="sm" dot>
                      Orphan Inventory
                    </Badge>
                  ) : displayStatus === 'OUT_OF_STOCK' ? (
                    <Badge variant="danger" size="sm" dot>
                      Out of Stock
                    </Badge>
                  ) : displayStatus === 'EXPIRING_SOON' ? (
                    <Badge variant="warning" size="sm" dot>
                      Expiring Soon
                    </Badge>
                  ) : displayStatus === 'LOW_STOCK' ? (
                    <Badge variant="warning" size="sm" dot>
                      Low Stock
                    </Badge>
                  ) : (
                    <Badge variant="success" size="sm" dot>
                      In Stock
                    </Badge>
                  )}
                </TableCell>

                {/* Asset Value */}
                <TableCell isNumeric>
                  <span className="text-xs font-mono text-slate-700">
                    ₹{val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <IconButton
                      aria-label="Inspect Item"
                      variant="ghost"
                      size="sm"
                      onClick={() => onInspectItem(item)}
                      icon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
                      title="Inspect product stock & batches"
                    />

                    {canTransfer && (
                      <IconButton
                        aria-label={`Transfer ${item.productName}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => onTransferItem(item)}
                        icon={<ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />}
                        title="Transfer to another location"
                      />
                    )}

                    {canAdjust && (
                      <IconButton
                        aria-label="Adjust Stock"
                        variant="ghost"
                        size="sm"
                        onClick={() => onAdjustItem(item)}
                        icon={<SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />}
                        title="Manual stock adjustment"
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
