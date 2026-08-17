'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  Button,
  FormField,
  Input,
  Select
} from '../../../components/ui';
import { stockTransferSchema, type StockTransferFormValues } from '../schemas';
import { useTransferStockMutation } from '../hooks';
import type { InventoryBalance } from '../types';

export interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: InventoryBalance | null;
  products: Array<{ id: string; name: string; sku?: string }>;
  storeOptions: Array<{ value: string; label: string }>;
  defaultLocationId: string;
}

export function StockTransferModal({
  isOpen,
  onClose,
  selectedItem,
  products,
  storeOptions,
  defaultLocationId
}: StockTransferModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const transferMutation = useTransferStockMutation();

  const activeStoreOptions = useMemo(
    () => storeOptions.filter((s) => s.value !== 'all'),
    [storeOptions]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<StockTransferFormValues>({
    resolver: zodResolver(stockTransferSchema as any),
    defaultValues: {
      productId: '',
      fromLocationId: defaultLocationId,
      toLocationId: activeStoreOptions[1]?.value || '',
      quantity: 1,
      transferId: '',
      notes: ''
    }
  });

  const fromLocationId = watch('fromLocationId');
  const toLocationId = watch('toLocationId');
  const currentProductId = watch('productId');

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      const initialFrom = selectedItem?.locationId && selectedItem.locationId !== 'all'
        ? selectedItem.locationId
        : activeStoreOptions[0]?.value || defaultLocationId;
      const initialTo = activeStoreOptions.find((s) => s.value !== initialFrom)?.value || '';

      reset({
        productId: selectedItem?.productId || products[0]?.id || '',
        fromLocationId: initialFrom,
        toLocationId: initialTo,
        quantity: 1,
        transferId: `TRF-${Date.now().toString().slice(-6)}`,
        notes: ''
      });
    }
  }, [isOpen, selectedItem, defaultLocationId, products, activeStoreOptions, reset]);

  const availableStock = selectedItem?.quantity ?? 0;

  const onSubmit = async (values: StockTransferFormValues) => {
    setServerError(null);
    try {
      await transferMutation.mutateAsync({
        productId: values.productId,
        fromLocationId: values.fromLocationId,
        toLocationId: values.toLocationId,
        quantity: values.quantity,
        transferId: values.transferId,
        notes: values.notes
      });
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to complete stock transfer.');
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
      title="Inter-Store Stock Transfer"
      description="Transfer inventory atomically between retail outlets with real-time balance updates"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={transferMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={transferMutation.isPending}
            onClick={handleSubmit(onSubmit)}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            Execute Transfer
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

        {/* Source and Destination Stores Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Source Outlet (Transfer From)" required error={errors.fromLocationId?.message}>
            <Select
              options={activeStoreOptions}
              value={fromLocationId}
              onChange={(e) => setValue('fromLocationId', e.target.value)}
            />
          </FormField>

          <FormField label="Target Outlet (Transfer To)" required error={errors.toLocationId?.message}>
            <Select
              options={activeStoreOptions}
              value={toLocationId}
              onChange={(e) => setValue('toLocationId', e.target.value)}
            />
          </FormField>
        </div>

        {/* Available Stock Indicator */}
        {selectedItem && (
          <div className="p-3 rounded-xl bg-[#0f172a] border border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400">Available at Source Outlet:</span>
            <span className="font-mono font-bold text-white tabular-nums">
              {availableStock.toLocaleString('en-IN', { maximumFractionDigits: 2 })} units
            </span>
          </div>
        )}

        {/* Quantity */}
        <FormField label="Transfer Quantity" required error={errors.quantity?.message}>
          <Input
            type="number"
            step="any"
            min="0.01"
            isNumeric
            placeholder="0.00"
            {...register('quantity')}
            autoFocus
          />
        </FormField>

        {/* Transfer Reference & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Transfer Ref #">
            <Input placeholder="e.g. TRF-2026-001" {...register('transferId')} />
          </FormField>
          <FormField label="Transfer Notes / Memo">
            <Input
              placeholder="e.g. Outlet stock replenishment"
              {...register('notes')}
            />
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
