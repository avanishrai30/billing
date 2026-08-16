'use client';

import React, { useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  Button,
  FormField,
  Input,
  Select,
  IconButton
} from '../../../components/ui';
import { supplyOrderFormSchema, type SupplyOrderFormValues } from '../schemas';
import { calculateSupplyOrderTotals } from '../calculations';
import { usePOSProductsQuery } from '../../pos/hooks';
import type { FranchiseDoc } from '../types';

export interface SupplyOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  franchises: FranchiseDoc[];
  selectedFranchiseId?: string;
  onSubmit: (values: SupplyOrderFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function SupplyOrderForm({
  isOpen,
  onClose,
  franchises,
  selectedFranchiseId,
  onSubmit,
  isLoading = false
}: SupplyOrderFormProps) {
  const { data: products = [] } = usePOSProductsQuery();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<SupplyOrderFormValues>({
    resolver: zodResolver(supplyOrderFormSchema as any),
    defaultValues: {
      franchiseId: selectedFranchiseId || (franchises[0]?.id ?? ''),
      date: new Date().toISOString().split('T')[0],
      items: [
        {
          productId: '',
          name: '',
          qty: 1,
          supplyPrice: 0,
          gst: 0,
          isCustom: false
        }
      ],
      subtotal: 0,
      tax: 0,
      grandTotal: 0,
      paymentStatus: 'paid',
      notes: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedFranchiseId = watch('franchiseId');
  const watchedItems = watch('items');

  const activeFranchise = useMemo(
    () => franchises.find((f) => f.id === watchedFranchiseId),
    [franchises, watchedFranchiseId]
  );

  const totals = useMemo(() => {
    return calculateSupplyOrderTotals(watchedItems || []);
  }, [watchedItems]);

  React.useEffect(() => {
    setValue('subtotal', totals.subtotal);
    setValue('tax', totals.tax);
    setValue('grandTotal', totals.grandTotal);
  }, [totals, setValue]);

  React.useEffect(() => {
    if (isOpen) {
      reset({
        franchiseId: selectedFranchiseId || (franchises[0]?.id ?? ''),
        date: new Date().toISOString().split('T')[0],
        items: [
          {
            productId: activeFranchise?.supplyList?.[0]?.productId || products[0]?.id || '',
            name: activeFranchise?.supplyList?.[0]?.name || products[0]?.name || '',
            qty: 1,
            supplyPrice: activeFranchise?.supplyList?.[0]?.supplyPrice || Number(products[0]?.purchasePrice ?? 0),
            gst: 0,
            isCustom: false
          }
        ],
        subtotal: 0,
        tax: 0,
        grandTotal: 0,
        paymentStatus: 'paid',
        notes: ''
      });
    }
  }, [isOpen, selectedFranchiseId, franchises, reset, activeFranchise, products]);

  const handleProductChange = (index: number, productId: string) => {
    const customItem = activeFranchise?.supplyList?.find((i) => i.productId === productId);
    if (customItem) {
      setValue(`items.${index}.productId`, customItem.productId);
      setValue(`items.${index}.name`, customItem.name);
      setValue(`items.${index}.supplyPrice`, Number(customItem.supplyPrice || 0));
      setValue(`items.${index}.isCustom`, customItem.isCustom || false);
      return;
    }

    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setValue(`items.${index}.productId`, prod.id);
      setValue(`items.${index}.name`, prod.name);
      setValue(`items.${index}.supplyPrice`, Number(prod.purchasePrice ?? prod.cost ?? 0));
      setValue(`items.${index}.gst`, Number(prod.gst || 0));
      setValue(`items.${index}.isCustom`, false);
    }
  };

  const handleFormSubmit = async (values: SupplyOrderFormValues) => {
    await onSubmit({
      ...values,
      subtotal: totals.subtotal,
      tax: totals.tax,
      grandTotal: totals.grandTotal
    });
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Record Supply Dispatch Order"
      description="Record wholesale supply goods dispatched to franchise partner."
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button form="supply-order-form" type="submit" variant="primary" isLoading={isLoading}>
            Submit Supply Order
          </Button>
        </div>
      }
    >
      <form id="supply-order-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Target Franchise */}
          <div className="sm:col-span-2">
            <FormField label="Franchise Partner Outlet" required error={errors.franchiseId?.message}>
              <Select
                {...register('franchiseId')}
                options={franchises.map((f) => ({
                  value: f.id,
                  label: `${f.name} (${f.location})`
                }))}
                className="bg-black/20 text-xs"
              />
            </FormField>
          </div>

          {/* Date */}
          <div>
            <FormField label="Dispatch Date">
              <Input
                type="date"
                {...register('date')}
                className="bg-black/20 text-xs"
              />
            </FormField>
          </div>
        </div>

        {/* Line Items Container */}
        <div className="space-y-2 border-t border-white/10 pt-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Dispatched Line Items
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  productId: activeFranchise?.supplyList?.[0]?.productId || products[0]?.id || '',
                  name: activeFranchise?.supplyList?.[0]?.name || products[0]?.name || 'Item',
                  qty: 1,
                  supplyPrice: activeFranchise?.supplyList?.[0]?.supplyPrice || Number(products[0]?.purchasePrice ?? 0),
                  gst: 0,
                  isCustom: false
                })
              }
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Add Item
            </Button>
          </div>

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-black/30 p-2.5 rounded-lg border border-white/5"
            >
              <div className="flex-1 min-w-[140px]">
                <select
                  className="w-full bg-[#001845] border border-white/10 rounded-lg p-1.5 text-xs text-white"
                  defaultValue={field.productId}
                  onChange={(e) => handleProductChange(index, e.target.value)}
                >
                  <option value="">-- Choose Product --</option>
                  {activeFranchise?.supplyList && activeFranchise.supplyList.length > 0 ? (
                    <optgroup label="Agreed Franchise Catalog">
                      {activeFranchise.supplyList.map((item) => (
                        <option key={item.productId} value={item.productId}>
                          ⭐ {item.name} (₹{item.supplyPrice})
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  <optgroup label="General Central Catalog">
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        📦 {p.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="w-24">
                <Input
                  type="number"
                  step="any"
                  placeholder="Wholesale ₹"
                  {...register(`items.${index}.supplyPrice`, { valueAsNumber: true })}
                  className="bg-black/20 text-xs"
                />
              </div>

              <div className="w-20">
                <Input
                  type="number"
                  placeholder="Qty"
                  {...register(`items.${index}.qty`, { valueAsNumber: true })}
                  className="bg-black/20 text-xs"
                />
              </div>

              <div className="w-20">
                <Input
                  type="number"
                  placeholder="GST %"
                  {...register(`items.${index}.gst`, { valueAsNumber: true })}
                  className="bg-black/20 text-xs"
                />
              </div>

              <IconButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                aria-label="Remove item"
                icon={<Trash2 className="h-4 w-4 text-rose-400" />}
              />
            </div>
          ))}
        </div>

        {/* Payment & Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-3">
          <div className="space-y-3">
            <FormField label="Payment Status">
              <Select
                {...register('paymentStatus')}
                options={[
                  { value: 'paid', label: 'Paid in Full (Contributes to Earnings)' },
                  { value: 'pending', label: 'Pending Payment' },
                  { value: 'credit', label: 'Supplied on Credit' },
                  { value: 'unpaid', label: 'Unpaid' }
                ]}
                className="bg-black/20 text-xs"
              />
            </FormField>

            <FormField label="Dispatch Notes">
              <Input
                placeholder="e.g. Batch #401 via Central Transport"
                {...register('notes')}
                className="bg-black/20 text-xs"
              />
            </FormField>
          </div>

          {/* Financial Summary Card */}
          <div className="bg-black/40 p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono text-white">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Total GST:</span>
              <span className="font-mono text-amber-400">₹{totals.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-white/10 pt-2 text-white">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-400">₹{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
