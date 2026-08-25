'use client';

import React from 'react';
import {
  Package,
  Building2,
  Warehouse,
  History,
  ArrowLeftRight,
  SlidersHorizontal,
  Layers,
  Calendar,
  AlertCircle,
  Tag
} from 'lucide-react';
import {
  Drawer,
  Badge,
  Button,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Skeleton
} from '../../../components/ui';
import { useInventoryLogsQuery } from '../hooks';
import type { NetworkInventoryItem, LocationStockBreakdown, ProductBatchSummary } from '../types';

export interface InventoryDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: NetworkInventoryItem | null;
  canAdjust?: boolean;
  canTransfer?: boolean;
  onAdjustStock?: (item: NetworkInventoryItem) => void;
  onTransferStock?: (item: NetworkInventoryItem) => void;
}

export function InventoryDetailDrawer({
  isOpen,
  onClose,
  item,
  canAdjust = false,
  canTransfer = false,
  onAdjustStock,
  onTransferStock
}: InventoryDetailDrawerProps) {
  const { data: logsData, isLoading: isLoadingLogs } = useInventoryLogsQuery({
    productId: item?.productId,
    limit: 15
  });

  if (!item) return null;

  const logs = logsData?.data || [];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={item.productName}
      description={`SKU: ${item.sku || 'No SKU'} • Barcode: ${item.barcode || 'None'}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="text-xs text-slate-500 font-mono">
            Product ID: <span className="text-slate-700">{item.productId}</span>
          </div>
          <div className="flex items-center gap-2">
            {canAdjust && onAdjustStock && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onAdjustStock(item);
                }}
                leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
              >
                Adjust Stock
              </Button>
            )}
            {canTransfer && onTransferStock && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onTransferStock(item);
                }}
                leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
              >
                Transfer Stock
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Orphan Notice if missing master */}
        {item.isOrphan && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">ORPHAN INVENTORY — Product Master Missing</div>
              <div className="mt-0.5 text-amber-700">
                This stock balance exists in the inventory ledger, but the corresponding Product Master record was deleted or not found.
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Overview Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Network On Hand</div>
            <div className="text-xl font-bold font-mono text-slate-900">
              {item.networkQuantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">{item.unit}</div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Reserved Units</div>
            <div className="text-xl font-bold font-mono text-amber-700">
              {item.networkReserved.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Pending checkout</div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl space-y-1">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Net Available</div>
            <div className="text-xl font-bold font-mono text-emerald-700">
              {item.networkAvailable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">Sellable stock</div>
          </div>
        </div>

        {/* Section 2: Stock By Location Breakdown */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Stock by Location Breakdown
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {item.locationBreakdown.length} Outlets
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <Table density="dense">
              <TableHeader>
                <tr>
                  <TableHead>Location</TableHead>
                  <TableHead isNumeric>On Hand</TableHead>
                  <TableHead isNumeric>Reserved</TableHead>
                  <TableHead isNumeric>Available</TableHead>
                  <TableHead align="right">Share</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {item.locationBreakdown.map((loc) => {
                  const sharePct = item.networkQuantity > 0 ? (loc.quantity / item.networkQuantity) * 100 : 0;
                  return (
                    <TableRow key={loc.locationId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {loc.isWarehouse ? (
                            <Warehouse className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          <span className="font-semibold text-xs text-slate-900">
                            {loc.locationName}
                          </span>
                          {loc.isWarehouse && (
                            <Badge variant="warning" size="sm">
                              HUB
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell isNumeric>
                        <span className="font-bold text-xs font-mono text-slate-900">
                          {loc.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell isNumeric>
                        <span className="text-xs font-mono text-slate-500">
                          {loc.reservedQuantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell isNumeric>
                        <span className="font-bold text-xs font-mono text-emerald-700">
                          {loc.available.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        <span className="text-xs text-slate-500 font-mono">
                          {sharePct.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Section 3: Active Batches & Expiry Dates */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              Active Product Batches & Expiry
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {item.batches.length} Active Lots
            </span>
          </div>

          {item.batches.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-center text-xs text-slate-500">
              No specific batch lots recorded. Stock tracked as general SKU inventory.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {item.batches.map((b) => (
                <div
                  key={b.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs font-mono text-slate-900">
                      LOT: {b.lotNumber}
                    </span>
                    <Badge variant={b.expiryDate ? 'warning' : 'neutral'} size="sm">
                      {b.expiryDate
                        ? `EXP ${new Date(b.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : 'No Expiry'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                    <span>Remaining Quantity:</span>
                    <span className="font-bold font-mono text-emerald-700">
                      {b.remainingQuantity} {item.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Recent Stock Movement Audit Trail */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-600" />
              Recent Stock Movement History
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Immutable Ledger
            </span>
          </div>

          {isLoadingLogs ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={idx} variant="rectangular" className="w-full h-10 rounded-lg" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-center text-xs text-slate-500">
              No recent movements logged for this product.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-64 overflow-y-auto">
              <Table density="dense">
                <TableHeader>
                  <tr>
                    <TableHead>Date / Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead isNumeric>Delta</TableHead>
                    <TableHead isNumeric>Balance</TableHead>
                    <TableHead>User / Ref</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const isPositive = log.quantity > 0;
                    return (
                      <TableRow key={log._id || log.movementId}>
                        <TableCell>
                          <span className="text-[11px] font-mono text-slate-600">
                            {new Date(log.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}{' '}
                            {new Date(log.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="neutral" size="sm">
                            {log.type}
                          </Badge>
                        </TableCell>
                        <TableCell isNumeric>
                          <span
                            className={`font-bold font-mono text-xs ${
                              isPositive ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {isPositive ? `+${log.quantity}` : log.quantity}
                          </span>
                        </TableCell>
                        <TableCell isNumeric>
                          <span className="font-mono text-xs text-slate-800">
                            {log.afterQuantity}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-[11px] text-slate-600 truncate max-w-[120px]">
                            {log.performedBy || 'system'}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
