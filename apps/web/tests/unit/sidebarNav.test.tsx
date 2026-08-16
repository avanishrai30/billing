import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../../components/layout/Sidebar';
import { AppProviders } from '../../providers/AppProviders';
import { sessionManager } from '../../lib/auth/session';
import type { AuthUser } from '../../types/auth';

jest.mock('next/navigation', () => ({
  usePathname: () => '/pos',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() })
}));

describe('Sidebar Component & RBAC Navigation Visibility', () => {
  beforeEach(() => {
    sessionManager.clearSession();
    jest.clearAllMocks();
  });

  it('1. Super Admin with wildcard permission sees all management navigation links', () => {
    const superAdmin: AuthUser = {
      id: 'usr-1',
      name: 'Super Admin',
      username: 'admin',
      role: 'SUPER ADMIN',
      category: 'super admin',
      assignedStoreId: 'all',
      status: 'active'
    };
    sessionManager.setToken('jwt-super');
    sessionManager.setUser(superAdmin);

    render(
      <AppProviders>
        <Sidebar isOpen={true} onClose={jest.fn()} />
      </AppProviders>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('POS Terminal')).toBeInTheDocument();
    expect(screen.getByText('Product Master')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('Purchases')).toBeInTheDocument();
    expect(screen.getByText('Invoices')).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('Suppliers')).toBeInTheDocument();
    expect(screen.getByText('Outlets')).toBeInTheDocument();
    expect(screen.getByText('Franchise')).toBeInTheDocument();
    expect(screen.getByText('Roles & Access')).toBeInTheDocument();
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('2. Cashier/Employee cannot see administrative settings or role permissions', () => {
    const employee: AuthUser = {
      id: 'usr-2',
      name: 'Cashier Staff',
      username: 'cashier1',
      role: 'CASHIER',
      category: 'employee',
      assignedStoreId: 'st-1',
      permissions: [
        'dashboard.view',
        'invoices.create',
        'products.view',
        'inventory.view',
        'invoices.view',
        'customers.view'
      ],
      status: 'active'
    };
    sessionManager.setToken('jwt-cashier');
    sessionManager.setUser(employee);

    render(
      <AppProviders>
        <Sidebar isOpen={true} onClose={jest.fn()} />
      </AppProviders>
    );

    // Permitted items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('POS Terminal')).toBeInTheDocument();
    expect(screen.getByText('Product Master')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();

    // Forbidden administrative items
    expect(screen.queryByText('Roles & Access')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit Trail')).not.toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Franchise')).not.toBeInTheDocument();
  });

  it('3. Triggers onClose callback when clicking mobile close button or backdrop', () => {
    const onClose = jest.fn();
    render(
      <AppProviders>
        <Sidebar isOpen={true} onClose={onClose} />
      </AppProviders>
    );

    const closeBtn = screen.getByLabelText(/close sidebar/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();

    const backdrop = screen.getByTestId('sidebar-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
