import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { StoreProfileFormSchema, type StoreProfileFormSchemaType } from '../schemas';
import { useUpdateStoreProfileMutation } from '../hooks';
import { useStoresQuery } from '../../stores/hooks';
import { useStoreScope } from '../../../providers/StoreScopeProvider';
import { useAuth } from '../../../hooks/useAuth';
import { LogoUploader } from './LogoUploader';

export function BusinessSettings() {
  const { hasPermission } = useAuth();
  const canManageStores = hasPermission('stores.update');

  const { activeStoreId } = useStoreScope();
  const { data: stores = [], isLoading: isStoresLoading, refetch } = useStoresQuery();

  const currentStore = (stores.find((s) => s.id === activeStoreId) || stores[0]) as any;

  const updateStoreMutation = useUpdateStoreProfileMutation();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty }
  } = useForm<StoreProfileFormSchemaType>({
    resolver: zodResolver(StoreProfileFormSchema as any),
    defaultValues: {
      name: '',
      subtitle: '',
      gstin: '',
      phone: '',
      email: '',
      upiId: '',
      address: '',
      logo: '',
      invoicePrefix: 'INV-',
      currency: 'INR',
      isActive: true,
      inventoryAlertThreshold: 5
    }
  });

  const currentLogo = watch('logo');

  useEffect(() => {
    if (currentStore) {
      reset({
        name: currentStore.name || '',
        subtitle: currentStore.subtitle || '',
        gstin: currentStore.gstin || '',
        phone: currentStore.phone || '',
        email: currentStore.email || '',
        upiId: currentStore.upiId || '',
        address: currentStore.address || '',
        logo: currentStore.logo || '',
        invoicePrefix: currentStore.invoicePrefix || 'INV-',
        currency: currentStore.currency || 'INR',
        isActive: currentStore.isActive !== undefined ? currentStore.isActive : true,
        inventoryAlertThreshold: currentStore.inventoryAlertThreshold || 5
      });
    }
  }, [currentStore, reset]);

  const onSubmit = async (values: StoreProfileFormSchemaType) => {
    if (!currentStore?.id) {
      setFeedback({ type: 'error', message: 'No store selected to update' });
      return;
    }

    setFeedback(null);
    try {
      await updateStoreMutation.mutateAsync({
        storeId: currentStore.id,
        payload: values
      });
      setFeedback({ type: 'success', message: `Store profile for '${values.name}' saved successfully.` });
      refetch();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update store profile' });
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Store & Business Billing Profile
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure legal entity details, tax identification numbers, and contact info for invoices.
          </p>
        </div>
        {!canManageStores && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
            Read-only mode (Requires stores.manage permission)
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Store Logo Uploader */}
        <LogoUploader
          currentLogoUrl={currentLogo}
          onLogoUploaded={(logoPath) => setValue('logo', logoPath, { shouldDirty: true })}
          disabled={!canManageStores || isStoresLoading}
          label="Outlet / Store Brand Logo"
          description="Customized logo printed on store thermal receipts and PDF tax invoices."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Business / Store Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Store / Business Name <span className="text-rose-600">*</span>
            </label>
            <Input
              {...register('name')}
              placeholder="e.g. VC Organics Mumbai Flagship"
              disabled={!canManageStores || isStoresLoading}
            />
            {errors.name && <p className="text-xs text-rose-700">{errors.name.message}</p>}
          </div>

          {/* Tagline / Subtitle */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Tagline / Subtitle
            </label>
            <Input
              {...register('subtitle')}
              placeholder="e.g. Pure Organics & A2 Farm Dairy"
              disabled={!canManageStores || isStoresLoading}
            />
            {errors.subtitle && <p className="text-xs text-rose-700">{errors.subtitle.message}</p>}
          </div>

          {/* GSTIN */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              GSTIN / Tax Registration No.
            </label>
            <Input
              {...register('gstin')}
              placeholder="e.g. 27AAAAA0000A1Z5"
              disabled={!canManageStores || isStoresLoading}
              className="font-mono"
            />
            {errors.gstin && <p className="text-xs text-rose-700">{errors.gstin.message}</p>}
          </div>

          {/* Contact Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Contact Phone
            </label>
            <Input
              {...register('phone')}
              placeholder="e.g. +91 98765 43210"
              disabled={!canManageStores || isStoresLoading}
            />
            {errors.phone && <p className="text-xs text-rose-700">{errors.phone.message}</p>}
          </div>

          {/* Support Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Support / Billing Email
            </label>
            <Input
              {...register('email')}
              type="email"
              placeholder="e.g. support@vcorganics.com"
              disabled={!canManageStores || isStoresLoading}
            />
            {errors.email && <p className="text-xs text-rose-700">{errors.email.message}</p>}
          </div>

          {/* UPI ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Payment UPI ID (for QR Code)
            </label>
            <Input
              {...register('upiId')}
              placeholder="e.g. vcorganics@icici"
              disabled={!canManageStores || isStoresLoading}
              className="font-mono"
            />
            {errors.upiId && <p className="text-xs text-rose-700">{errors.upiId.message}</p>}
          </div>

          {/* Invoice Prefix */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Invoice Prefix
            </label>
            <Input
              {...register('invoicePrefix')}
              placeholder="e.g. VC-MUM-"
              disabled={!canManageStores || isStoresLoading}
              className="font-mono"
            />
            {errors.invoicePrefix && <p className="text-xs text-rose-700">{errors.invoicePrefix.message}</p>}
          </div>

          {/* Currency */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Billing Currency
            </label>
            <Input
              {...register('currency')}
              placeholder="e.g. INR"
              disabled={!canManageStores || isStoresLoading}
              className="font-mono"
            />
            {errors.currency && <p className="text-xs text-rose-700">{errors.currency.message}</p>}
          </div>

          {/* Address Location */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Business Location / Street Address
            </label>
            <Input
              {...register('address')}
              placeholder="e.g. Shop #4, Market Yard, Pune, Maharashtra 411037"
              disabled={!canManageStores || isStoresLoading}
            />
            {errors.address && <p className="text-xs text-rose-700">{errors.address.message}</p>}
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Action Button */}
        {canManageStores && (
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={updateStoreMutation.isPending || isStoresLoading || !isDirty}
              className="px-6 py-2.5 font-semibold"
              leftIcon={
                updateStoreMutation.isPending ? <Loader2 className="animate-spin" /> : <Save />
              }
            >
              {updateStoreMutation.isPending ? 'Saving Profile...' : 'Save Business Profile'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
