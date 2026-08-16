'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SlidersHorizontal, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  Button,
  FormField,
  Input,
  Select
} from '../../../components/ui';
import { stockAdjustmentSchema, type StockAdjustmentFormValues } from '../schemas';
import { useAdjustStockMutation } from '../hooks';
import type { InventoryBalance } from '../types';

export interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: InventoryBalance | null;
  products: Array<{ id: string; name: string; sku?: string; cost?: number }>;
  storeOptions: Array<{ value: string; label: string }>;
  defaultLocationId: string;
}

export function StockAdjustmentModal({
  isOpen,
  onClose,
  selectedItem,
  products,
  storeOptions,
  defaultLocationId
}: StockAdjustmentModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const adjustMutation = useAdjustStockMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema as any),
    defaultValues: {
      productId: '',
      locationId: defaultLocationId,
      quantity: 0,
      type: 'MANUAL_ADJUSTMENT',
      referenceId: '',
      notes: ''
    }
  });

  const currentProductId = watch('productId');
  const targetQuantity = watch('quantity');

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      if (selectedItem) {
        reset({
          productId: selectedItem.productId,
          locationId: selectedItem.locationId === 'all' ? defaultLocationId : selectedItem.locationId,
          quantity: selectedItem.quantity,
          type: 'MANUAL_ADJUSTMENT',
          referenceId: `ADJ-${Date.now().toString().slice(-6)}`,
          notes: ''
        });
      } else {
        reset({
          productId: products[0]?.id || '',
          locationId: defaultLocationId,
          quantity: 0,
          type: 'MANUAL_ADJUSTMENT',
          referenceId: `ADJ-${Date.now().toString().slice(-6)}`,
          notes: ''
        });
      }
    }
  }, [isOpen, selectedItem, defaultLocationId, products, reset]);

  const selectedProduct = products.find((p) => p.id === currentProductId);
  const currentStock = selectedItem?.quantity ?? 0;
  const delta = (Number(targetQuantity) || 0) - currentStock;

  const onSubmit = async (values: StockAdjustmentFormValues) => {
    setServerError(null);
    try {
      await adjustMutation.mutateAsync({
        productId: values.productId,
        locationId: values.locationId,
        quantity: values.quantity,
        type: values.type || 'MANUAL_ADJUSTMENT',
        referenceId: values.referenceId,
        notes: values.notes,
        cost: selectedProduct?.cost || 0
      });
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to submit stock adjustment.');
    }
  };

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.sku || 'No SKU'})`
  }));

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Level Adjustment"
      description="Reconcile physical stock count with immutable audit trail logging"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={adjustMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={adjustMutation.isPending}
            onClick={handleSubmit(onSubmit)}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            Confirm Adjustment
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Product Selection */}
        <FormField label="Product Line" required error={errors.productId?.message}>
          <Select
            options={productOptions}
            value={currentProductId}
            onChange={(e) => setValue('productId', e.target.value)}
            disabled={!!selectedItem}
          />
        </FormField>

        {/* Store Location */}
        <FormField label="Store Outlet" required error={errors.locationId?.message}>
          <Select
            options={storeOptions}
            value={watch('locationId')}
            onChange={(e) => setValue('locationId', e.target.value)}
            disabled={!!selectedItem}
          />
        </FormField>

        {/* Quantity Reconciliation Grid */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#021b47] border border-white/10">
          <div>
            <span className="text-[11px] text-slate-400 block">Current Balance</span>
            <span className="text-sm font-mono font-bold text-white tabular-nums">
              {currentStock.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Adjustment Delta</span>
            <span
              className={`text-sm font-mono font-bold tabular-nums ${
                delta > 0
                  ? 'text-emerald-400'
                  : delta < 0
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          </div>
        </div>

        {/* Target Quantity Input */}
        <FormField
          label="New Physical Count (Target Quantity)"
          required
          error={errors.quantity?.message}
        >
          <Input
            type="number"
            step="any"
            min="0"
            isNumeric
            placeholder="0.00"
            {...register('quantity')}
            autoFocus
          />
        </FormField>

        {/* Audit Reference & Reason Note */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Audit Ref # (Optional)">
            <Input placeholder="e.g. AUDIT-2026-Q3" {...register('referenceId')} />
          </FormField>
          <FormField label="Audit Reason Note" required error={errors.notes?.message}>
            <Input
              placeholder="e.g. Physical count reconciliation"
              {...register('notes')}
            />
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
