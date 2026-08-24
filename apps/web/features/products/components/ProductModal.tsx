'use client';

import React, { useLayoutEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, Input, Select, Button, FormField, Textarea } from '../../../components/ui';
import { AlertTriangle } from 'lucide-react';
import { productFormSchema, type ProductFormValues } from '../schemas';
import { useSaveProductMutation } from '../hooks';
import { ProductImageUploader } from './ProductImageUploader';
import { ProductBarcodeManager } from './ProductBarcodeManager';
import { calculateProductMargin } from '../calculations';
import type { ProductDoc, BarcodeSource } from '../types';

export interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: ProductDoc | null;
  categories: string[];
  brands: string[];
  suppliers: string[];
}

export function ProductModal({
  isOpen,
  onClose,
  product,
  categories,
  brands,
  suppliers
}: ProductModalProps) {
  const isEditing = !!product?.id;
  const saveMutation = useSaveProductMutation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showBarcodeConfirm, setShowBarcodeConfirm] = useState(false);
  const [pendingValues, setPendingValues] = useState<ProductFormValues | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema as any),
    defaultValues: {
      id: '',
      name: '',
      sku: '',
      barcode: '',
      barcodeSource: null,
      barcodeType: 'PRIMARY',
      category: '',
      brand: 'VC Organic',
      supplier: '',
      purchasePrice: 0,
      sellingPrice: 0,
      gst: 0,
      unit: 'pc',
      weight: 0,
      weightUnit: 'g',
      sellingMode: 'packaged',
      type: 'OWN',
      dom: '',
      doe: '',
      status: 'active',
      description: '',
      image: '',
      reorderLevel: 5,
      maxStock: 100,
      barcodes: [],
      variants: []
    }
  });

  const watchSellingPrice = watch('sellingPrice') || 0;
  const watchPurchasePrice = watch('purchasePrice') || 0;
  const marginPercent = calculateProductMargin(watchSellingPrice, watchPurchasePrice);

  useLayoutEffect(() => {
    if (isOpen) {
      setServerError(null);
      setShowBarcodeConfirm(false);
      setPendingValues(null);
      if (product) {
        reset({
          id: product.id,
          name: product.name || '',
          sku: product.sku || '',
          barcode: product.barcode || '',
          barcodeSource: product.barcodeSource || null,
          barcodeType: product.barcodeType || 'PRIMARY',
          category: product.category || '',
          brand: product.brand || 'VC Organic',
          supplier: product.supplier || '',
          purchasePrice: product.purchasePrice || product.cost || 0,
          sellingPrice: product.sellingPrice || product.price || 0,
          gst: product.gst || 0,
          unit: product.unit || 'pc',
          weight: product.weight || 0,
          weightUnit: product.weightUnit || 'g',
          sellingMode: product.sellingMode || 'packaged',
          type: (product.type || 'OWN').toUpperCase() as 'OWN' | 'EXTERNAL',
          dom: product.dom || '',
          doe: product.doe || '',
          defaultExpiryDate: product.defaultExpiryDate || product.doe || '',
          status: product.status || 'active',
          description: product.description || '',
          image: product.image || '',
          reorderLevel: product.reorderLevel !== undefined ? product.reorderLevel : 5,
          maxStock: product.maxStock !== undefined ? product.maxStock : 100,
          barcodes: product.barcodes || [],
          variants: product.variants || []
        });
      } else {
        reset({
          id: '',
          name: '',
          sku: `SKU-${Date.now().toString().slice(-6)}`,
          barcode: '',
          barcodeSource: null,
          barcodeType: 'PRIMARY',
          category: categories[0] || 'General',
          brand: 'VC Organic',
          supplier: suppliers[0] || '',
          purchasePrice: 0,
          sellingPrice: 0,
          gst: 0,
          unit: 'pc',
          weight: 0,
          weightUnit: 'g',
          sellingMode: 'packaged',
          type: 'OWN',
          dom: '',
          doe: '',
          defaultExpiryDate: '',
          status: 'active',
          description: '',
          image: '',
          reorderLevel: 5,
          maxStock: 100,
          barcodes: [],
          variants: []
        });
      }
    }
  }, [isOpen, product, reset, categories, suppliers]);

  const performSave = async (values: ProductFormValues) => {
    setServerError(null);
    try {
      const payload: ProductFormValues = {
        ...values,
        id: product?.id || values.id || undefined
      };
      await saveMutation.mutateAsync(payload);
      setShowBarcodeConfirm(false);
      setPendingValues(null);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save product SKU.';
      setServerError(msg);
    }
  };

  const onSubmit = async (values: ProductFormValues) => {
    const existingBarcode = (product?.barcode || '').trim();
    const newBarcode = (values.barcode || '').trim();

    // Barcode Change Protection: prompt confirmation if existing barcode is being replaced
    if (isEditing && existingBarcode && newBarcode !== existingBarcode && !showBarcodeConfirm) {
      setPendingValues(values);
      setShowBarcodeConfirm(true);
      return;
    }

    await performSave(values);
  };

  const gstOptions = [
    { value: '0', label: '0% (Exempt)' },
    { value: '5', label: '5% GST' },
    { value: '12', label: '12% GST' },
    { value: '18', label: '18% GST' },
    { value: '28', label: '28% GST' }
  ];

  const unitOptions = [
    { value: 'pc', label: 'Pieces (pc)' },
    { value: 'pack', label: 'Packs (pack)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'gm', label: 'Grams (gm)' },
    { value: 'ltr', label: 'Litres (ltr)' },
    { value: 'ml', label: 'Millilitres (ml)' },
    { value: 'bottle', label: 'Bottles (bottle)' },
    { value: 'tin', label: 'Tins (tin)' },
    { value: 'box', label: 'Boxes (box)' }
  ];

  const typeOptions = [
    { value: 'OWN', label: 'Own Private Label' },
    { value: 'EXTERNAL', label: 'External Vendor Product' }
  ];

  const sellingModeOptions = [
    { value: 'packaged', label: 'Packaged Standard Unit' },
    { value: 'loose', label: 'Loose / Weighed Commodity' },
    { value: 'weight_based', label: 'Weight-based Scale item' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Active Catalog Item' },
    { value: 'inactive', label: 'Inactive / Suspended' }
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Product Master: ${product?.name}` : 'Register New Product SKU'}
      description="Configure canonical master details, multi-barcode bindings, tax rates, and pricing."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...register('id')} />
        {serverError && (
          <div
            role="alert"
            className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium"
          >
            {serverError}
          </div>
        )}

        {/* 1. Core Identification */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-slate-800 border-b border-slate-200 pb-2">
            Product Identification
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Product Full Name" htmlFor="product-name" required error={errors.name?.message}>
              <Input
                id="product-name"
                {...register('name')}
                placeholder="e.g. A2 Desi Cow Cultured Ghee 500ml"
              />
            </FormField>

            <FormField label="Product SKU Code" htmlFor="product-sku" required error={errors.sku?.message}>
              <Input
                id="product-sku"
                {...register('sku')}
                placeholder="e.g. GHEE-A2-500M"
                className="font-mono"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Category" htmlFor="product-category" error={errors.category?.message}>
              <Input
                id="product-category"
                {...register('category')}
                placeholder="e.g. Dairy / Cold Pressed Oils"
                list="category-suggestions"
              />
              <datalist id="category-suggestions">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </FormField>

            <FormField label="Brand / Label" htmlFor="product-brand" error={errors.brand?.message}>
              <Input
                id="product-brand"
                {...register('brand')}
                placeholder="e.g. VC Organic"
                list="brand-suggestions"
              />
              <datalist id="brand-suggestions">
                {brands.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </FormField>

            <FormField label="Preferred Supplier" htmlFor="product-supplier" error={errors.supplier?.message}>
              <Input
                id="product-supplier"
                {...register('supplier')}
                placeholder="e.g. Green Valley Farm"
                list="supplier-suggestions"
              />
              <datalist id="supplier-suggestions">
                {suppliers.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </FormField>
          </div>
        </div>

        {/* 2. Pricing, Tax & Commercials */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-semibold text-slate-800">
              Commercial Pricing & Tax
            </h4>
            <span className="text-xs font-mono font-semibold text-emerald-700">
              Est. Margin: {marginPercent}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField
              label="Procurement Cost Price (₹)"
              htmlFor="product-purchase-price"
              required
              error={errors.purchasePrice?.message}
            >
              <Input
                id="product-purchase-price"
                type="number"
                step="0.01"
                {...register('purchasePrice', { valueAsNumber: true })}
                placeholder="0.00"
                className="font-mono"
              />
            </FormField>

            <FormField
              label="Retail Selling Price (₹)"
              htmlFor="product-selling-price"
              required
              error={errors.sellingPrice?.message}
            >
              <Input
                id="product-selling-price"
                type="number"
                step="0.01"
                {...register('sellingPrice', { valueAsNumber: true })}
                placeholder="0.00"
                className="font-mono font-semibold text-slate-950"
              />
            </FormField>

            <FormField label="GST Tax Slab" error={errors.gst?.message}>
              <Controller
                name="gst"
                control={control}
                render={({ field }) => (
                  <Select
                    options={gstOptions}
                    value={String(field.value ?? 0)}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                  />
                )}
              />
            </FormField>
          </div>
        </div>

        {/* 3. Physical Specs & Formats */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-slate-800 border-b border-slate-200 pb-2">
            Physical Specifications & Classification
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <FormField label="Stock Keeping Unit" error={errors.unit?.message}>
              <Controller
                name="unit"
                control={control}
                render={({ field }) => (
                  <Select
                    options={unitOptions}
                    value={field.value || 'pc'}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </FormField>

            <FormField label="Selling Format" error={errors.sellingMode?.message}>
              <Controller
                name="sellingMode"
                control={control}
                render={({ field }) => (
                  <Select
                    options={sellingModeOptions}
                    value={field.value || 'packaged'}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </FormField>

            <FormField label="Product Ownership" error={errors.type?.message}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    options={typeOptions}
                    value={field.value || 'OWN'}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </FormField>

            <FormField label="Catalog Status" error={errors.status?.message}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    options={statusOptions}
                    value={field.value || 'active'}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Reorder Alert Threshold" error={errors.reorderLevel?.message}>
              <Input
                type="number"
                {...register('reorderLevel', { valueAsNumber: true })}
                placeholder="5"
                className="font-mono"
              />
            </FormField>

            <FormField label="Target Max Capacity" error={errors.maxStock?.message}>
              <Input
                type="number"
                {...register('maxStock', { valueAsNumber: true })}
                placeholder="100"
                className="font-mono"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <FormField
              label="Default Expiry Date (Optional)"
              error={errors.defaultExpiryDate?.message}
            >
              <Input
                type="date"
                {...register('defaultExpiryDate')}
                placeholder="YYYY-MM-DD"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Default expiry for this SKU. Batch expiry overrides this value.
              </p>
            </FormField>

            <FormField
              label="Date of Manufacture (Optional)"
              error={errors.dom?.message}
            >
              <Input
                type="date"
                {...register('dom')}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
          </div>
        </div>

        {/* 4. Barcodes & Source */}
        <Controller
          name="barcodes"
          control={control}
          render={({ field }) => (
            <ProductBarcodeManager
              primaryBarcode={watch('barcode')}
              onPrimaryBarcodeChange={(val) => setValue('barcode', val)}
              barcodeSource={watch('barcodeSource')}
              onBarcodeSourceChange={(val) => setValue('barcodeSource', val)}
              productType={watch('type')}
              barcodes={field.value || []}
              onChangeBarcodes={field.onChange}
              disabled={isSubmitting}
            />
          )}
        />

        {/* Barcode Change Protection Warning Alert */}
        {showBarcodeConfirm && pendingValues && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Confirm Barcode Replacement
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              You are replacing the existing registered barcode for <strong>{product?.name}</strong>.
              Changing an assigned barcode affects active POS scanner lookups and invalidates printed physical labels.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white p-2.5 rounded border border-amber-200">
              <div>Previous: <strong className="text-slate-700">{product?.barcode}</strong></div>
              <div>New: <strong className="text-blue-700">{pendingValues.barcode || '(None)'}</strong></div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowBarcodeConfirm(false)}
              >
                Keep Previous Barcode
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => performSave(pendingValues)}
                isLoading={saveMutation.isPending}
              >
                Confirm & Replace Barcode
              </Button>
            </div>
          </div>
        )}

        {/* 5. Image & Description */}
        <div className="space-y-4">
          <Controller
            name="image"
            control={control}
            render={({ field }) => (
              <ProductImageUploader
                value={field.value}
                onChange={field.onChange}
                disabled={isSubmitting}
              />
            )}
          />

          <FormField label="Catalog Description & Notes" error={errors.description?.message}>
            <Textarea
              {...register('description')}
              placeholder="Enter product provenance, tasting notes, storage guidelines, or organic certifications..."
              rows={2}
            />
          </FormField>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEditing ? 'Save Product Changes' : 'Create Product SKU'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
