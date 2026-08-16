'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  Button,
  FormField,
  Input
} from '../../../components/ui';
import { businessFormSchema, type BusinessFormValues } from '../schemas';
import { useCreateBusinessMutation, useUpdateBusinessMutation } from '../hooks';
import type { BusinessDoc } from '../types';

export interface BusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: BusinessDoc | null;
}

export function BusinessModal({
  isOpen,
  onClose,
  business
}: BusinessModalProps) {
  const isEditing = !!business;
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreateBusinessMutation();
  const updateMutation = useUpdateBusinessMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<BusinessFormValues>({
    resolver: zodResolver(businessFormSchema as any),
    defaultValues: {
      id: '',
      name: '',
      subtitle: '',
      owner: '',
      gstin: '',
      phone: '',
      email: '',
      address: '',
      bankName: '',
      accountNo: '',
      ifsc: '',
      upiId: '',
      status: 'active'
    }
  });

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      if (business) {
        reset({
          id: business.id,
          name: business.name,
          subtitle: business.subtitle || '',
          owner: business.owner || '',
          gstin: business.gstin || '',
          phone: business.phone || '',
          email: business.email || '',
          address: business.address || '',
          bankName: business.bankName || '',
          accountNo: business.accountNo || '',
          ifsc: business.ifsc || '',
          upiId: business.upiId || '',
          status: (business.status as 'active' | 'inactive') || 'active'
        });
      } else {
        reset({
          id: '',
          name: '',
          subtitle: '',
          owner: '',
          gstin: '',
          phone: '',
          email: '',
          address: '',
          bankName: '',
          accountNo: '',
          ifsc: '',
          upiId: '',
          status: 'active'
        });
      }
    }
  }, [isOpen, business, reset]);

  const onSubmit = async (values: BusinessFormValues) => {
    setServerError(null);
    try {
      if (isEditing && business) {
        await updateMutation.mutateAsync({
          id: business.id,
          payload: values
        });
      } else {
        await createMutation.mutateAsync(values);
      }
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to save business profile.');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Business Profile: ${business.name}` : 'Register Business Profile'}
      description="Configure enterprise branding, legal tax identifiers, and banking details"
      maxWidth="lg"
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
            {isEditing ? 'Save Changes' : 'Register Business'}
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

        {/* Business Name & Tagline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Legal Business Name" required error={errors.name?.message}>
            <Input
              placeholder="e.g. VC Organic Billing Pvt Ltd"
              {...register('name')}
              autoFocus={!isEditing}
            />
          </FormField>

          <FormField label="Tagline / Branch Subtitle" error={errors.subtitle?.message}>
            <Input
              placeholder="e.g. Pure Organic Farm Products"
              {...register('subtitle')}
            />
          </FormField>
        </div>

        {/* Owner & GSTIN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Proprietor / Owner Name" error={errors.owner?.message}>
            <Input
              placeholder="e.g. Avanish Rai"
              {...register('owner')}
            />
          </FormField>

          <FormField label="GSTIN / Tax ID" error={errors.gstin?.message}>
            <Input
              placeholder="e.g. 27AAAAA0000A1Z5"
              {...register('gstin')}
            />
          </FormField>
        </div>

        {/* Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Contact Phone" error={errors.phone?.message}>
            <Input
              type="tel"
              placeholder="e.g. 9876543210"
              {...register('phone')}
            />
          </FormField>

          <FormField label="Contact Email" error={errors.email?.message}>
            <Input
              type="email"
              placeholder="e.g. admin@vcorganic.com"
              {...register('email')}
            />
          </FormField>
        </div>

        {/* Address */}
        <FormField label="Registered Business Address" error={errors.address?.message}>
          <Input
            placeholder="e.g. 102 Green Acres, Bandra West, Mumbai - 400050"
            {...register('address')}
          />
        </FormField>

        {/* Banking Section */}
        <div className="pt-2 border-t border-white/10">
          <h4 className="font-semibold text-slate-300 mb-2">Banking & UPI Payment Instructions</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Bank Name" error={errors.bankName?.message}>
              <Input
                placeholder="e.g. HDFC Bank Ltd"
                {...register('bankName')}
              />
            </FormField>

            <FormField label="Account Number" error={errors.accountNo?.message}>
              <Input
                placeholder="e.g. 50200012345678"
                {...register('accountNo')}
              />
            </FormField>

            <FormField label="IFSC Code" error={errors.ifsc?.message}>
              <Input
                placeholder="e.g. HDFC0000123"
                {...register('ifsc')}
              />
            </FormField>

            <FormField label="Merchant UPI ID" error={errors.upiId?.message}>
              <Input
                placeholder="e.g. vcorganic@hdfcbank"
                {...register('upiId')}
              />
            </FormField>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
