'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  Button,
  FormField,
  Input,
  Select
} from '../../../components/ui';
import { userFormSchema, type UserFormValues } from '../schemas';
import type { UserDoc } from '../types';
import type { StoreDoc } from '../../stores/types';

export interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserDoc | null;
  stores: StoreDoc[];
  onSubmit: (values: UserFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function UserModal({
  isOpen,
  onClose,
  user,
  stores,
  onSubmit,
  isLoading = false
}: UserModalProps) {
  const isEditing = Boolean(user?.id);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema as any),
    defaultValues: {
      id: user?.id || undefined,
      name: user?.name || '',
      username: user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
      password: '',
      role: user?.role || '',
      category: user?.category || 'employee',
      assignedStoreId: user?.assignedStoreId || 'all',
      assignedStores: user?.assignedStores || ['all'],
      status: user?.status || 'active',
      permissions: user?.permissions || []
    }
  });

  const watchedCategory = watch('category');

  React.useEffect(() => {
    if (isOpen) {
      reset({
        id: user?.id || undefined,
        name: user?.name || '',
        username: user?.username || '',
        email: user?.email || '',
        phone: user?.phone || '',
        password: '',
        role: user?.role || '',
        category: user?.category || 'employee',
        assignedStoreId: user?.assignedStoreId || 'all',
        assignedStores: user?.assignedStores || ['all'],
        status: user?.status || 'active',
        permissions: user?.permissions || []
      });
    }
  }, [isOpen, user, reset]);

  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setValue('assignedStoreId', val);
    setValue('assignedStores', [val]);
  };

  const handleFormSubmit = async (values: UserFormValues) => {
    // If editing and password is empty, don't send empty string
    const payload = { ...values };
    if (isEditing && !payload.password) {
      delete payload.password;
    }
    await onSubmit(payload);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit User: ${user?.name}` : 'Register New User Account'}
      description={
        isEditing
          ? 'Update account credentials, role categories, and store scoping privileges.'
          : 'Create a new team member account with role permissions and store assignments.'
      }
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button form="user-form" type="submit" variant="primary" isLoading={isLoading}>
            {isEditing ? 'Save Changes' : 'Create User Account'}
          </Button>
        </div>
      }
    >
      <form id="user-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <FormField label="Full Name" required error={errors.name?.message}>
            <Input
              placeholder="e.g. Ramesh Patil"
              {...register('name')}
              className="bg-black/20 text-xs"
            />
          </FormField>

          {/* Username */}
          <FormField label="Username" required error={errors.username?.message}>
            <Input
              placeholder="e.g. ramesh.patil"
              {...register('username')}
              disabled={isEditing}
              className="bg-black/20 font-mono text-xs"
            />
          </FormField>

          {/* Email */}
          <FormField label="Email Address" error={errors.email?.message}>
            <Input
              type="email"
              placeholder="e.g. ramesh@example.com"
              {...register('email')}
              className="bg-black/20 text-xs"
            />
          </FormField>

          {/* Phone */}
          <FormField label="Phone Number" error={errors.phone?.message}>
            <Input
              placeholder="e.g. 9876543210"
              {...register('phone')}
              className="bg-black/20 text-xs"
            />
          </FormField>

          {/* Password */}
          <FormField
            label={isEditing ? 'New Password (leave blank to keep current)' : 'Password'}
            required={!isEditing}
            error={errors.password?.message}
          >
            <Input
              type="password"
              placeholder={isEditing ? '••••••••' : 'Enter strong password (min 6 chars)'}
              {...register('password')}
              className="bg-black/20 text-xs font-mono"
            />
          </FormField>

          {/* Role Display Title */}
          <FormField label="Custom Role Title" required error={errors.role?.message}>
            <Input
              placeholder="e.g. Senior Branch Cashier / Store Manager"
              {...register('role')}
              className="bg-black/20 text-xs"
            />
          </FormField>

          {/* Canonical Role Category */}
          <FormField label="Authorization Category" required>
            <Select
              {...register('category')}
              options={[
                { value: 'employee', label: 'Employee / Cashier (Standard Operations)' },
                { value: 'admin', label: 'Admin (Full Branch Operations & Catalog)' },
                { value: 'auditor', label: 'Auditor (Read-Only Ledger & Tax Access)' },
                { value: 'super admin', label: 'Super Admin (Unrestricted System Owner)' }
              ]}
              className="bg-black/20 text-xs"
            />
          </FormField>

          {/* Store Scope Assignment */}
          <FormField label="Store Scope Assignment">
            <Select
              value={watch('assignedStoreId')}
              onChange={handleStoreChange}
              options={[
                { value: 'all', label: '🌐 All Stores (Master Enterprise Access)' },
                ...stores.map((s) => ({
                  value: s.id,
                  label: `📍 ${s.name} (${s.code || s.address || 'Store'})`
                }))
              ]}
              disabled={watchedCategory === 'super admin'}
              className="bg-black/20 text-xs"
            />
          </FormField>

          {/* Account Status */}
          <FormField label="Account Status">
            <Select
              {...register('status')}
              options={[
                { value: 'active', label: 'Active (Permitted to Log In)' },
                { value: 'suspended', label: 'Suspended (Access Blocked)' },
                { value: 'inactive', label: 'Inactive (Decommissioned)' }
              ]}
              className="bg-black/20 text-xs"
            />
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
