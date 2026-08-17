import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../../components/layout/Sidebar';
import { useAuth } from '../../hooks/useAuth';

jest.mock('next/navigation', () => ({
  usePathname: () => '/pos',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() })
}));

jest.mock('../../hooks/useAuth');
jest.mock('../../hooks/usePublicSettings', () => ({
  usePublicSettings: () => ({
    portalTitle: 'AIAVRO Billing OS',
    appLogoUrl: null,
    isLoading: false
  })
}));

describe('Sidebar Component & RBAC Navigation Visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. Super Admin with wildcard permission sees all management navigation links', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id: 'usr-1',
        name: 'Super Admin',
        username: 'admin',
        role: 'SUPER ADMIN',
        category: 'super admin',
        assignedStoreId: 'all',
        status: 'active'
      },
      hasPermission: () => true,
      isAuthenticated: true
    });

    render(<Sidebar isOpen={true} onClose={jest.fn()} />);

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
    const allowed = [
      'dashboard.view',
      'invoices.create',
      'products.view',
      'inventory.view',
      'invoices.view',
      'customers.view'
    ];
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id: 'usr-2',
        name: 'Cashier Staff',
        username: 'cashier1',
        role: 'CASHIER',
        category: 'employee',
        assignedStoreId: 'st-1',
        permissions: allowed,
        status: 'active'
      },
      hasPermission: (perm: string) => allowed.includes(perm),
      isAuthenticated: true
    });

    render(<Sidebar isOpen={true} onClose={jest.fn()} />);

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
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      hasPermission: () => false,
      isAuthenticated: false
    });

    const onClose = jest.fn();
    render(<Sidebar isOpen={true} onClose={onClose} />);

    const closeBtn = screen.getByLabelText(/close sidebar/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();

    const backdrop = screen.getByTestId('sidebar-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
