'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  Button,
  FormField,
  Input,
  Select
} from '../../../components/ui';
import { storeFormSchema, type StoreFormValues } from '../schemas';
import { useCreateStoreMutation, useUpdateStoreMutation } from '../hooks';
import type { StoreDoc } from '../types';

export interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreDoc | null;
}

export function StoreModal({
  isOpen,
  onClose,
  store
}: StoreModalProps) {
  const isEditing = !!store;
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreateStoreMutation();
  const updateMutation = useUpdateStoreMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema as any),
    defaultValues: {
      id: '',
      name: '',
      code: '',
      address: '',
      phone: '',
      locationType: 'STORE',
      status: 'active'
    }
  });

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      if (store) {
        reset({
          id: store.id,
          name: store.name,
          code: store.code || '',
          address: store.address || '',
          phone: store.phone || '',
          locationType: (store.locationType === 'WAREHOUSE' ? 'WAREHOUSE' : 'STORE'),
          status: (store.status as 'active' | 'inactive') || 'active'
        });
      } else {
        reset({
          id: '',
          name: '',
          code: '',
          address: '',
          phone: '',
          locationType: 'STORE',
          status: 'active'
        });
      }
    }
  }, [isOpen, store, reset]);

  const onSubmit = async (values: StoreFormValues) => {
    setServerError(null);
    try {
      if (isEditing && store) {
        await updateMutation.mutateAsync({
          id: store.id,
          payload: values
        });
      } else {
        await createMutation.mutateAsync(values);
      }
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to save store details.');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Store Outlet: ${store.name}` : 'Register New Store Branch'}
      description="Configure store location, branch code, and operating status"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isPending}
            onClick={handleSubmit(onSubmit)}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            {isEditing ? 'Save Changes' : 'Register Store'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
        {serverError && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Store Name & Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Store Outlet Name" required error={errors.name?.message}>
            <Input
              placeholder="e.g. Bandra West Outlet"
              {...register('name')}
              autoFocus={!isEditing}
            />
          </FormField>

          <FormField label="Branch Code" required error={errors.code?.message}>
            <Input
              placeholder="e.g. ST-BAN"
              {...register('code')}
            />
          </FormField>
        </div>

        {/* Location Type & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Physical Location Type" error={errors.locationType?.message}>
            <Select
              {...register('locationType')}
              options={[
                { value: 'STORE', label: 'Store' },
                { value: 'WAREHOUSE', label: 'Warehouse' }
              ]}
            />
          </FormField>

          <FormField label="Operating Status" error={errors.status?.message}>
            <select
              {...register('status')}
              className="w-full bg-[#001845] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
            >
              <option value="active">Active (Operational)</option>
              <option value="inactive">Inactive (Offline)</option>
            </select>
          </FormField>
        </div>

        {/* Phone */}
        <FormField label="Contact Phone" error={errors.phone?.message}>
          <Input
            type="tel"
            placeholder="e.g. 022-26401234"
            {...register('phone')}
          />
        </FormField>

        {/* Address */}
        <FormField label="Store Physical Address" error={errors.address?.message}>
          <Input
            placeholder="e.g. Shop 12, Hill Road, Bandra West, Mumbai"
            {...register('address')}
          />
        </FormField>

        {/* Distribution HUB Designation */}
        <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl space-y-2.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('isHub')}
              className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="font-semibold text-xs text-purple-950">
              Designate as Distribution HUB
            </span>
          </label>
          <p className="text-[11px] text-slate-500 pl-6">
            Distribution Hubs act as primary inward stock receivers and regional transfer dispatch centers.
          </p>
        </div>
      </form>
    </Dialog>
  );
}
