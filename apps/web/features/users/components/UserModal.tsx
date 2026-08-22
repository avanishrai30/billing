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
import { PERMISSION_MODULE_GROUPS } from '../../permissions/components/PermissionMatrix';
import { useUserEffectivePermissionsQuery } from '../hooks';

const authorizationRoleLabels: Record<UserFormValues['category'], string> = {
  employee: 'Employee',
  admin: 'Admin',
  auditor: 'Auditor',
  'super admin': 'Super Admin'
};

const defaultRoleTitles = new Set(Object.values(authorizationRoleLabels));

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
      permissions: user?.permissions || [],
      permissionGrants: user?.permissionGrants || [],
      permissionDenies: user?.permissionDenies || []
    }
  });

  const watchedCategory = watch('category');
  const watchedRole = watch('role');
  const watchedGrants = watch('permissionGrants') || [];
  const watchedDenies = watch('permissionDenies') || [];
  const effectivePermissionsQuery = useUserEffectivePermissionsQuery(user?.id);
  const rolePermissions = effectivePermissionsQuery.data?.rolePermissions || [];
  const effectivePermissions = effectivePermissionsQuery.data?.effectivePermissions || [];

  React.useLayoutEffect(() => {
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
        permissions: user?.permissions || [],
        permissionGrants: user?.permissionGrants || [],
        permissionDenies: user?.permissionDenies || []
      });
    }
  }, [isOpen, user, reset]);

  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setValue('assignedStoreId', val);
    setValue('assignedStores', [val]);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCategory = e.target.value as UserFormValues['category'];
    const currentRoleTitle = (watch('role') || '').trim();
    setValue('category', nextCategory, { shouldDirty: true });
    if (!currentRoleTitle || defaultRoleTitles.has(currentRoleTitle)) {
      setValue('role', authorizationRoleLabels[nextCategory], { shouldDirty: true });
    }
  };

  const handlePermissionOverride = (permissionId: string, mode: 'inherit' | 'grant' | 'deny') => {
    const nextGrants = watchedGrants.filter((id) => id !== permissionId);
    const nextDenies = watchedDenies.filter((id) => id !== permissionId);

    if (mode === 'grant') {
      nextGrants.push(permissionId);
    }
    if (mode === 'deny') {
      nextDenies.push(permissionId);
    }

    setValue('permissionGrants', Array.from(new Set(nextGrants)), { shouldDirty: true });
    setValue('permissionDenies', Array.from(new Set(nextDenies)), { shouldDirty: true });
  };

  const getOverrideMode = (permissionId: string) => {
    if (watchedGrants.includes(permissionId)) return 'grant';
    if (watchedDenies.includes(permissionId)) return 'deny';
    return 'inherit';
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
          ? 'Update account credentials, authorization roles, and store scoping privileges.'
          : 'Create a new team member account with authorization permissions and store assignments.'
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
              className="text-xs"
            />
          </FormField>

          {/* Username */}
          <FormField label="Username" required error={errors.username?.message}>
            <Input
              placeholder="e.g. ramesh.patil"
              {...register('username')}
              disabled={isEditing}
              className="font-mono text-xs"
            />
          </FormField>

          {/* Email */}
          <FormField label="Email Address" error={errors.email?.message}>
            <Input
              type="email"
              placeholder="e.g. ramesh@example.com"
              {...register('email')}
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
              className="text-xs font-mono"
            />
          </FormField>

          {/* Canonical Role Category */}
          <div className="sm:col-span-2 rounded-md border border-blue-100 bg-blue-50/70 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Authorization Role</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{authorizationRoleLabels[watchedCategory]}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Job Title</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{watchedRole || 'Not set'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Effective Access</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {effectivePermissionsQuery.isLoading && isEditing
                    ? 'Loading...'
                    : `${effectivePermissions.length || 0} permissions`}
                </p>
              </div>
            </div>
          </div>

          {/* Canonical Authorization Role */}
          <FormField label="Authorization Role" required>
            <Select
              aria-label="Authorization Role"
              value={watchedCategory}
              onChange={handleCategoryChange}
              options={[
                { value: 'employee', label: 'Employee' },
                { value: 'admin', label: 'Admin' },
                { value: 'auditor', label: 'Auditor' },
                { value: 'super admin', label: 'Super Admin' }
              ]}
              className="text-xs"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              This controls the user's permissions and application access.
            </p>
          </FormField>

          {/* Role Display Title */}
          <FormField label="Job Title / Display Title" required error={errors.role?.message}>
            <Input
              placeholder="e.g. Senior Branch Cashier / Store Manager"
              {...register('role')}
              className="text-xs"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              This is a descriptive job title and does not control permissions.
            </p>
          </FormField>

          {/* Store Scope Assignment */}
          <FormField label="Store Scope Assignment">
            <Select
              aria-label="Store Scope Assignment"
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
              className="text-xs"
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
              className="text-xs"
            />
          </FormField>
        </div>

        <details className="rounded-md border border-gray-200 bg-white">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-gray-700">
            Access & Permissions
            <span className="ml-2 font-normal text-gray-500">
              Role {rolePermissions.length || 0} · Grants {watchedGrants.length} · Denies {watchedDenies.length} · Effective {effectivePermissions.length || 0}
            </span>
          </summary>

          <div className="max-h-[360px] space-y-3 overflow-y-auto border-t border-gray-200 p-3">
            {PERMISSION_MODULE_GROUPS.map((group) => (
              <section key={group.id} className="space-y-2">
                <div>
                  <h4 className="text-xs font-semibold text-gray-800">{group.title}</h4>
                  <p className="text-[11px] text-gray-500">{group.description}</p>
                </div>

                <div className="divide-y divide-gray-100 rounded-md border border-gray-100">
                  {group.permissions.map((permission) => {
                    const mode = getOverrideMode(permission.id);
                    const inherited = rolePermissions.includes(permission.id);

                    return (
                      <div
                        key={permission.id}
                        className="grid grid-cols-1 gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <div>
                          <p className="text-xs font-medium text-gray-800">{permission.name}</p>
                          <p className="text-[11px] text-gray-500">
                            {inherited ? 'Inherited from role' : 'Not inherited'} · {permission.id}
                          </p>
                        </div>
                        <div className="inline-flex h-8 overflow-hidden rounded-md border border-gray-200 text-[11px]">
                          {(['inherit', 'grant', 'deny'] as const).map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handlePermissionOverride(permission.id, option)}
                              className={[
                                'px-2 font-medium capitalize transition-colors',
                                mode === option
                                  ? option === 'deny'
                                    ? 'bg-red-50 text-red-700'
                                    : option === 'grant'
                                      ? 'bg-green-50 text-green-700'
                                      : 'bg-gray-100 text-gray-800'
                                  : 'bg-white text-gray-500 hover:bg-gray-50'
                              ].join(' ')}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </details>
      </form>
    </Dialog>
  );
}
