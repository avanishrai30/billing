import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  PermissionHeader,
  RoleTabs,
  PermissionGroup,
  PermissionMatrix
} from '../../features/permissions/components';
import type { RolePermissionsMatrix, PermissionModuleGroup } from '../../features/permissions/types';

describe('RBAC Permissions UI Components Suite', () => {
  const mockMatrix: RolePermissionsMatrix = {
    admin: ['dashboard.view', 'products.view', 'invoices.create'],
    employee: ['invoices.create', 'scanner.use'],
    auditor: ['invoices.view', 'audit.view']
  };

  const mockGroup: PermissionModuleGroup = {
    id: 'pos',
    title: 'POS Terminal & Sales',
    description: 'Cashier checkout and billing operations',
    permissions: [
      {
        id: 'invoices.create',
        name: 'Create Invoices',
        description: 'Allows completing checkout',
        module: 'pos'
      },
      {
        id: 'invoices.void',
        name: 'Void Invoices',
        description: 'Allows reversing transactions',
        module: 'pos'
      }
    ]
  };

  it('1. PermissionHeader renders title and triggers save callback', () => {
    const onSave = jest.fn();
    const onReset = jest.fn();

    render(
      <PermissionHeader
        hasChanges={true}
        canUpdate={true}
        onSave={onSave}
        onReset={onReset}
      />
    );

    expect(screen.getByText('Role-Based Access Control (RBAC) Matrix')).toBeInTheDocument();
    expect(screen.getByText('Save RBAC Matrix')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Save RBAC Matrix'));
    expect(onSave).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Discard Changes'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('2. RoleTabs switches active role tab and displays badge count', () => {
    const onChangeRole = jest.fn();
    const counts = { admin: 3, employee: 2, auditor: 2 };

    render(
      <RoleTabs
        activeRole="admin"
        onChangeRole={onChangeRole}
        permissionCounts={counts}
      />
    );

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Employee / Cashier')).toBeInTheDocument();
    expect(screen.getByText('Auditor')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Employee / Cashier'));
    expect(onChangeRole).toHaveBeenCalledWith('employee');
  });

  it('3. PermissionGroup renders fine-grained permission checkboxes and triggers toggle', () => {
    const onToggle = jest.fn();
    const onToggleGroup = jest.fn();

    render(
      <PermissionGroup
        group={mockGroup}
        selectedPermissions={['invoices.create']}
        onTogglePermission={onToggle}
        onToggleGroup={onToggleGroup}
      />
    );

    expect(screen.getByText('POS Terminal & Sales')).toBeInTheDocument();
    expect(screen.getByText('Create Invoices')).toBeInTheDocument();
    expect(screen.getByText('Void Invoices')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Void Invoices'));
    expect(onToggle).toHaveBeenCalledWith('invoices.void');

    fireEvent.click(screen.getByText('Select All'));
    expect(onToggleGroup).toHaveBeenCalledWith(['invoices.create', 'invoices.void'], true);
  });

  it('4. PermissionMatrix renders role tabs and module groups', () => {
    const onChange = jest.fn();

    render(
      <PermissionMatrix
        matrix={mockMatrix}
        canUpdate={true}
        onChangeMatrix={onChange}
      />
    );

    expect(screen.getByText('Executive Dashboard & Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Product Master Catalog & Pricing')).toBeInTheDocument();
    expect(screen.getByText('Central Stock & Inventory Movement')).toBeInTheDocument();
  });
});
