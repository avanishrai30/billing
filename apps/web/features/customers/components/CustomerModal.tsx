'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  Button,
  FormField,
  Input
} from '../../../components/ui';
import { customerFormSchema, type CustomerFormValues } from '../schemas';
import { useCreateCustomerMutation, useUpdateCustomerMutation } from '../hooks';
import type { CustomerDoc } from '../types';

export interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerDoc | null;
}

export function CustomerModal({
  isOpen,
  onClose,
  customer
}: CustomerModalProps) {
  const isEditing = !!customer;
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreateCustomerMutation();
  const updateMutation = useUpdateCustomerMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema as any),
    defaultValues: {
      id: '',
      name: '',
      phone: '',
      email: '',
      gstin: '',
      address: ''
    }
  });

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      if (customer) {
        reset({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email || '',
          gstin: customer.gstin || customer.gst || '',
          address: customer.address || ''
        });
      } else {
        reset({
          id: '',
          name: '',
          phone: '',
          email: '',
          gstin: '',
          address: ''
        });
      }
    }
  }, [isOpen, customer, reset]);

  const onSubmit = async (values: CustomerFormValues) => {
    setServerError(null);
    try {
      if (isEditing && customer) {
        await updateMutation.mutateAsync({
          id: customer.id,
          payload: {
            name: values.name,
            phone: values.phone,
            email: values.email || undefined,
            gstin: values.gstin || undefined,
            address: values.address || undefined
          }
        });
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          phone: values.phone,
          email: values.email || undefined,
          gstin: values.gstin || undefined,
          address: values.address || undefined
        });
      }
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to save customer details.');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Customer: ${customer.name}` : 'Register Buyer Customer Profile'}
      description={
        isEditing
          ? 'Update contact details, billing address, and tax information'
          : 'Create a new customer profile for POS lookup and invoice distribution'
      }
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
            {isEditing ? 'Save Changes' : 'Register Customer'}
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

        {/* Name & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Customer Full Name" required error={errors.name?.message}>
            <Input
              placeholder="e.g. Avanish Rai"
              {...register('name')}
              autoFocus={!isEditing}
            />
          </FormField>

          <FormField label="Mobile Phone Number" required error={errors.phone?.message}>
            <Input
              type="tel"
              placeholder="e.g. 9876543210"
              {...register('phone')}
            />
          </FormField>
        </div>

        {/* Email & GSTIN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Email Address (Optional)" error={errors.email?.message}>
            <Input
              type="email"
              placeholder="e.g. avanish@example.com"
              {...register('email')}
            />
          </FormField>

          <FormField label="GSTIN / Tax ID (Optional)" error={errors.gstin?.message}>
            <Input
              placeholder="e.g. 27AAAAA0000A1Z5"
              {...register('gstin')}
            />
          </FormField>
        </div>

        {/* Address */}
        <FormField label="Billing / Shipping Address (Optional)" error={errors.address?.message}>
          <Input
            placeholder="e.g. 102 Green Acres, Bandra West, Mumbai"
            {...register('address')}
          />
        </FormField>
      </form>
    </Dialog>
  );
}
