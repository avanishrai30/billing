'use client';

import React from 'react';
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
import { franchiseFormSchema, type FranchiseFormValues } from '../schemas';
import { usePOSProductsQuery } from '../../pos/hooks';
import type { FranchiseDoc } from '../types';

export interface FranchiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  franchise?: FranchiseDoc | null;
  onSubmit: (values: FranchiseFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function FranchiseModal({
  isOpen,
  onClose,
  franchise,
  onSubmit,
  isLoading = false
}: FranchiseModalProps) {
  const isEditing = Boolean(franchise?.id);
  const { data: products = [] } = usePOSProductsQuery();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<FranchiseFormValues>({
    resolver: zodResolver(franchiseFormSchema as any),
    defaultValues: {
      id: franchise?.id || undefined,
      name: franchise?.name || '',
      location: franchise?.location || '',
      owner: franchise?.owner || '',
      phone: franchise?.phone || '',
      email: franchise?.email || '',
      gstin: franchise?.gstin || '',
      status: franchise?.status || 'active',
      supplyList: franchise?.supplyList || []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'supplyList'
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        id: franchise?.id || undefined,
        name: franchise?.name || '',
        location: franchise?.location || '',
        owner: franchise?.owner || '',
        phone: franchise?.phone || '',
        email: franchise?.email || '',
        gstin: franchise?.gstin || '',
        status: franchise?.status || 'active',
        supplyList: franchise?.supplyList || []
      });
    }
  }, [isOpen, franchise, reset]);

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setValue(`supplyList.${index}.productId`, prod.id);
      setValue(`supplyList.${index}.name`, prod.name);
      setValue(`supplyList.${index}.supplyPrice`, Number(prod.purchasePrice ?? prod.cost ?? 0));
      setValue(`supplyList.${index}.retailPrice`, Number(prod.sellingPrice ?? prod.price ?? 0));
      setValue(`supplyList.${index}.isCustom`, false);
    }
  };

  const handleFormSubmit = async (values: FranchiseFormValues) => {
    await onSubmit(values);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Franchise Partner Details' : 'Register New Franchise Partner'}
      description={
        isEditing
          ? 'Update franchise contact details, legal entity info, and wholesale pricing agreements.'
          : 'Register a new franchise outlet and configure wholesale supply prices.'
      }
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button form="franchise-form" type="submit" variant="primary" isLoading={isLoading}>
            {isEditing ? 'Save Changes' : 'Register Franchise'}
          </Button>
        </div>
      }
    >
      <form id="franchise-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Franchise Store Name */}
          <FormField label="Franchise Store Name" required error={errors.name?.message}>
            <Input
              placeholder="e.g. VC Organics - Thane West"
              {...register('name')}
              className="text-xs"
            />
          </FormField>

          {/* Location / City */}
          <FormField label="Location / City" required error={errors.location?.message}>
            <Input
              placeholder="e.g. Thane, Maharashtra"
              {...register('location')}
              className="text-xs"
            />
          </FormField>

          {/* Owner / Primary Contact */}
          <FormField label="Owner / Franchisee Name" required error={errors.owner?.message}>
            <Input
              placeholder="e.g. Vikram Shinde"
              {...register('owner')}
              className="text-xs"
            />
          </FormField>

          {/* Phone */}
          <FormField label="Phone Number" error={errors.phone?.message}>
            <Input
              placeholder="e.g. 9876543210"
              {...register('phone')}
              className="text-xs"
            />
          </FormField>

          {/* Email */}
          <FormField label="Email Address" error={errors.email?.message}>
            <Input
              type="email"
              placeholder="e.g. franchise@example.com"
              {...register('email')}
              className="text-xs"
            />
          </FormField>

          {/* GSTIN */}
          <FormField label="GSTIN (15-character)" error={errors.gstin?.message}>
            <Input
              placeholder="e.g. 27AAAAA0000A1Z5"
              {...register('gstin')}
              className="font-mono uppercase text-xs"
            />
          </FormField>

          {/* Status */}
          <FormField label="Partner Status">
            <Select
              {...register('status')}
              options={[
                { value: 'active', label: 'Active Partner' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' }
              ]}
              className="text-xs"
            />
          </FormField>
        </div>

        {/* Supply Agreement Catalog */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-slate-900">
                Wholesale Supply Agreement Catalog
              </h4>
              <p className="text-[11px] text-slate-500">
                Pre-agreed wholesale supply prices and recommended retail MRP for this partner
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  productId: products[0]?.id || 'custom-item',
                  name: products[0]?.name || 'Product',
                  supplyPrice: Number(products[0]?.purchasePrice ?? 0),
                  retailPrice: Number(products[0]?.sellingPrice ?? 0),
                  isCustom: false
                })
              }
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Add Product
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-4 text-center text-xs text-slate-500 border border-slate-200">
              No custom products added yet. Click &quot;Add Product&quot; to define pre-set wholesale prices.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                >
                  <div className="flex-1 min-w-[140px]">
                    <select
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 focus-ring"
                      defaultValue={field.productId}
                      onChange={(e) => handleProductSelect(index, e.target.value)}
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <Input
                      type="number"
                      step="any"
                      placeholder="Supply Price"
                      {...register(`supplyList.${index}.supplyPrice`, { valueAsNumber: true })}
                      className="text-xs"
                    />
                  </div>

                  <div className="w-28">
                    <Input
                      type="number"
                      step="any"
                      placeholder="Retail MRP"
                      {...register(`supplyList.${index}.retailPrice`, { valueAsNumber: true })}
                      className="text-xs"
                    />
                  </div>

                  <IconButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    aria-label="Remove item"
                    icon={<Trash2 className="h-4 w-4 text-rose-600" />}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </Dialog>
  );
}
