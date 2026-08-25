'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftRight, AlertCircle, CheckCircle2, Warehouse, Building2, Layers } from 'lucide-react';
import {
  Dialog,
  Button,
  FormField,
  Input,
  Select,
  Badge
} from '../../../components/ui';
import { stockTransferSchema, type StockTransferFormValues } from '../schemas';
import { useTransferStockMutation } from '../hooks';
import type { CommandCenterStore, NetworkInventoryItem, ProductBatchSummary } from '../types';

export interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: NetworkInventoryItem | null;
  items: NetworkInventoryItem[];
  stores: CommandCenterStore[];
  defaultLocationId?: string;
}

export function StockTransferModal({
  isOpen,
  onClose,
  selectedItem,
  items,
  stores,
  defaultLocationId
}: StockTransferModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const transferMutation = useTransferStockMutation();

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [fromLocId, setFromLocId] = useState<string>('');
  const [toLocId, setToLocId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [transferQty, setTransferQty] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  // Find active product item
  const currentProduct = useMemo(() => {
    return items.find((it) => it.productId === selectedProductId) || selectedItem || items[0] || null;
  }, [items, selectedProductId, selectedItem]);

  // Default locations setup
  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      const prod = selectedItem || items[0] || null;
      const initialProdId = prod?.productId || '';
      setSelectedProductId(initialProdId);

      const warehouse = stores.find((s) => s.isWarehouse) || stores[0];
      const retailStore = stores.find((s) => s.id !== warehouse?.id) || stores[1] || stores[0];

      const initialFrom = defaultLocationId && defaultLocationId !== 'network'
        ? defaultLocationId
        : (warehouse?.id || '');
      const initialTo = stores.find((s) => s.id !== initialFrom)?.id || retailStore?.id || '';

      setFromLocId(initialFrom);
      setToLocId(initialTo);
      setSelectedBatchId('');
      setTransferQty(1);
      setNotes('');
    }
  }, [isOpen, selectedItem, items, stores, defaultLocationId]);

  // Source and Destination stock calculations
  const sourceStock = useMemo(() => {
    if (!currentProduct || !fromLocId) return 0;
    const locBreakdown = currentProduct.locationBreakdown.find((l) => l.locationId === fromLocId);
    return locBreakdown ? locBreakdown.quantity : 0;
  }, [currentProduct, fromLocId]);

  const destStock = useMemo(() => {
    if (!currentProduct || !toLocId) return 0;
    const locBreakdown = currentProduct.locationBreakdown.find((l) => l.locationId === toLocId);
    return locBreakdown ? locBreakdown.quantity : 0;
  }, [currentProduct, toLocId]);

  const networkTotal = currentProduct?.networkQuantity ?? 0;

  // Active batches for current product
  const availableBatches = useMemo(() => {
    if (!currentProduct) return [];
    return currentProduct.batches || [];
  }, [currentProduct]);

  // Source and Destination names
  const fromStoreName = stores.find((s) => s.id === fromLocId)?.name || fromLocId;
  const toStoreName = stores.find((s) => s.id === toLocId)?.name || toLocId;

  // Validation
  const isSameLocation = fromLocId === toLocId;
  const isInsufficient = transferQty > sourceStock || sourceStock <= 0;
  const isInvalidQty = transferQty <= 0 || isNaN(transferQty);
  const canSubmit = !isSameLocation && !isInsufficient && !isInvalidQty && !!selectedProductId && !transferMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setServerError(null);

    try {
      await transferMutation.mutateAsync({
        productId: selectedProductId,
        fromLocationId: fromLocId,
        toLocationId: toLocId,
        quantity: transferQty,
        batchId: selectedBatchId || undefined,
        transferId: `trf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        notes
      });
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to complete stock transfer.');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Inter-Store Stock Transfer"
      description="Transfer stock atomically between Central Warehouse and retail outlets with batch preservation"
      footer={
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="text-xs text-slate-500 font-mono">
            Network Total: <span className="font-bold text-slate-800">{networkTotal} {currentProduct?.unit || 'units'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={transferMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={transferMutation.isPending}
              disabled={!canSubmit}
              onClick={handleSubmit}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Confirm Transfer
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Product Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Select Product</label>
          <select
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              setSelectedBatchId('');
            }}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
          >
            {items.map((it) => (
              <option key={it.productId} value={it.productId}>
                {it.productName} ({it.sku || 'No SKU'}) — On Hand: {it.networkQuantity} {it.unit}
              </option>
            ))}
          </select>
        </div>

        {/* Source and Destination Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5 text-amber-600" />
              Source Location (From)
            </label>
            <select
              value={fromLocId}
              onChange={(e) => setFromLocId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isWarehouse ? '(Central Hub)' : ''}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-slate-500">
              Available at source: <span className="font-bold text-slate-900">{sourceStock} {currentProduct?.unit}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Destination Location (To)
            </label>
            <select
              value={toLocId}
              onChange={(e) => setToLocId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isWarehouse ? '(Central Hub)' : ''}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-slate-500">
              Current at destination: <span className="font-bold text-slate-900">{destStock} {currentProduct?.unit}</span>
            </div>
          </div>
        </div>

        {/* Batch Selection (if available) */}
        {availableBatches.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Inventory Batch / Lot (Optional)
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
            >
              <option value="">General Stock (FEFO / Unassigned Lot)</option>
              {availableBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  LOT: {b.lotNumber} • {b.expiryDate ? `EXP ${new Date(b.expiryDate).toLocaleDateString('en-GB')}` : 'No Exp'} • {b.remainingQuantity} units available
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Transfer Quantity */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Quantity to Transfer ({currentProduct?.unit || 'units'})
          </label>
          <Input
            type="number"
            min={1}
            max={sourceStock > 0 ? sourceStock : 1}
            step="any"
            value={transferQty}
            onChange={(e) => setTransferQty(parseFloat(e.target.value) || 0)}
          />
          {isInsufficient && (
            <div className="text-[11px] text-rose-600 font-medium">
              Transfer quantity exceeds source available stock ({sourceStock} {currentProduct?.unit}).
            </div>
          )}
          {isSameLocation && (
            <div className="text-[11px] text-rose-600 font-medium">
              Source and Destination locations cannot be identical.
            </div>
          )}
        </div>

        {/* Transfer Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Notes / Reference (Optional)</label>
          <Input
            placeholder="e.g. Inter-store stock replenishment request #402"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Live Simulation Preview */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Live Transfer Simulation Preview
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-200/60">
            {/* Source */}
            <div className="space-y-0.5">
              <div className="text-slate-500 text-[11px] truncate">{fromStoreName}</div>
              <div className="font-mono font-bold text-slate-900">
                {sourceStock} → <span className="text-amber-700">{Math.max(0, sourceStock - transferQty)}</span>
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-0.5">
              <div className="text-slate-500 text-[11px] truncate">{toStoreName}</div>
              <div className="font-mono font-bold text-slate-900">
                {destStock} → <span className="text-emerald-700">{destStock + transferQty}</span>
              </div>
            </div>

            {/* Network Total (Invariant) */}
            <div className="space-y-0.5">
              <div className="text-slate-500 text-[11px]">Network Total</div>
              <div className="font-mono font-bold text-slate-900">
                {networkTotal} → <span className="text-slate-900">{networkTotal}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
