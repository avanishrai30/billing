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
import { supplierFormSchema, type SupplierFormValues } from '../schemas';
import { useCreateSupplierMutation, useUpdateSupplierMutation } from '../hooks';
import type { SupplierDoc } from '../types';

export interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierDoc | null;
}

export function SupplierModal({
  isOpen,
  onClose,
  supplier
}: SupplierModalProps) {
  const isEditing = !!supplier;
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreateSupplierMutation();
  const updateMutation = useUpdateSupplierMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema as any),
    defaultValues: {
      id: '',
      name: '',
      contact: '',
      email: '',
      gst: '',
      address: ''
    }
  });

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      if (supplier) {
        reset({
          id: supplier.id,
          name: supplier.name,
          contact: supplier.contact,
          email: supplier.email || '',
          gst: supplier.gst || supplier.gstin || '',
          address: supplier.address || ''
        });
      } else {
        reset({
          id: '',
          name: '',
          contact: '',
          email: '',
          gst: '',
          address: ''
        });
      }
    }
  }, [isOpen, supplier, reset]);

  const onSubmit = async (values: SupplierFormValues) => {
    setServerError(null);
    try {
      if (isEditing && supplier) {
        await updateMutation.mutateAsync({
          id: supplier.id,
          payload: {
            name: values.name,
            contact: values.contact,
            email: values.email || undefined,
            gst: values.gst || undefined,
            address: values.address || undefined
          }
        });
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          contact: values.contact,
          email: values.email || undefined,
          gst: values.gst || undefined,
          address: values.address || undefined
        });
      }
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to save supplier details.');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Supplier: ${supplier.name}` : 'Register New Supply Partner'}
      description={
        isEditing
          ? 'Update contact details, dispatch address, and GST tax information'
          : 'Create a new supplier profile for purchase invoice entry and inventory inward logs'
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
            {isEditing ? 'Save Changes' : 'Register Supplier'}
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

        {/* Name & Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Supplier Company Name" required error={errors.name?.message}>
            <Input
              placeholder="e.g. Golden Ghee Co."
              {...register('name')}
              autoFocus={!isEditing}
            />
          </FormField>

          <FormField label="Contact Phone Number" required error={errors.contact?.message}>
            <Input
              type="tel"
              placeholder="e.g. 9876543210"
              {...register('contact')}
            />
          </FormField>
        </div>

        {/* Email & GSTIN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Email Address (Optional)" error={errors.email?.message}>
            <Input
              type="email"
              placeholder="e.g. orders@goldenghee.com"
              {...register('email')}
            />
          </FormField>

          <FormField label="GSTIN / Tax ID (Optional)" error={errors.gst?.message}>
            <Input
              placeholder="e.g. 27AAAAA0000A1Z5"
              {...register('gst')}
            />
          </FormField>
        </div>

        {/* Address */}
        <FormField label="Warehouse / Dispatch Address (Optional)" error={errors.address?.message}>
          <Input
            placeholder="e.g. Unit 4, Anand Industrial Estate, Gujarat"
            {...register('address')}
          />
        </FormField>
      </form>
    </Dialog>
  );
}
