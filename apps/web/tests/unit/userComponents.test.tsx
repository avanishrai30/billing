import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  UserHeader,
  UserSummaryCards,
  UserTable,
  UserModal,
  UserDeactivateDialog
} from '../../features/users/components';
import type { UserDoc } from '../../features/users/types';
import type { StoreDoc } from '../../features/stores/types';

jest.mock('../../features/users/api', () => ({
  userApi: {
    getEffectivePermissions: jest.fn().mockResolvedValue({
      success: true,
      userId: 'usr-1',
      category: 'employee',
      rolePermissions: ['dashboard.view'],
      permissionGrants: [],
      permissionDenies: [],
      effectivePermissions: ['dashboard.view']
    })
  }
}));

describe('User UI Components Suite', () => {
  const mockUser: UserDoc = {
    id: 'usr-1',
    name: 'Sanjay Deshmukh',
    username: 'sanjay.d',
    email: 'sanjay@example.com',
    phone: '9876543210',
    role: 'Store Manager',
    category: 'admin',
    assignedStoreId: 'store-1',
    status: 'active',
    tokenVersion: 1,
    createdAt: new Date().toISOString()
  };

  const mockStore: StoreDoc = {
    id: 'store-1',
    name: 'Mumbai Flagship',
    code: 'ST-MUM',
    status: 'active',
    createdAt: new Date().toISOString()
  };

  it('1. UserHeader renders title and triggers Add User modal', () => {
    const onAdd = jest.fn();

    render(
      <UserHeader
        totalUsers={5}
        activeUsers={4}
        canCreate={true}
        onAddUser={onAdd}
      />
    );

    expect(screen.getByText('User Accounts & Team Management')).toBeInTheDocument();
    expect(screen.getByText('5 Accounts (4 Active)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Add New User'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('2. UserSummaryCards renders role breakdowns', () => {
    const metrics = {
      totalUsers: 5,
      activeUsers: 4,
      suspendedUsers: 1,
      superAdmins: 1,
      admins: 2,
      employees: 1,
      auditors: 1
    };

    render(<UserSummaryCards metrics={metrics} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('4 / 5')).toBeInTheDocument();
    expect(screen.getByText('1 Super / 2 Admin')).toBeInTheDocument();
    expect(screen.getByText('1 Staff / 1 Auditor')).toBeInTheDocument();
  });

  it('3. UserTable renders profile info, store badge, and action callbacks', () => {
    const onView = jest.fn();
    const onEdit = jest.fn();
    const onDeactivate = jest.fn();

    render(
      <UserTable
        users={[mockUser]}
        stores={[mockStore]}
        currentUserId="usr-other"
        isLoading={false}
        canManage={true}
        onViewUser={onView}
        onEditUser={onEdit}
        onDeactivateUser={onDeactivate}
      />
    );

    expect(screen.getByText('Sanjay Deshmukh')).toBeInTheDocument();
    expect(screen.getByText('@sanjay.d')).toBeInTheDocument();
    expect(screen.getByText('Store Manager')).toBeInTheDocument();
    expect(screen.getByText('Mumbai Flagship')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('View user details for Sanjay Deshmukh'));
    expect(onView).toHaveBeenCalledWith(mockUser);

    fireEvent.click(screen.getByLabelText('Edit user Sanjay Deshmukh'));
    expect(onEdit).toHaveBeenCalledWith(mockUser);

    fireEvent.click(screen.getByLabelText('Deactivate user Sanjay Deshmukh'));
    expect(onDeactivate).toHaveBeenCalledWith(mockUser);
  });

  it('4. UserDeactivateDialog confirms suspension and displays session notice', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();

    render(
      <UserDeactivateDialog
        isOpen={true}
        onClose={onClose}
        user={mockUser}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Suspend User Account')).toBeInTheDocument();
    expect(screen.getByText(/will immediately revoke all active browser sessions/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirm Suspension'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('5. UserModal resets open form state when authoritative selected user version changes', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    const employeeUser: UserDoc = {
      ...mockUser,
      role: 'Admin',
      category: 'employee',
      updatedAt: '2026-08-22T20:00:00.000Z'
    };
    const adminUser: UserDoc = {
      ...employeeUser,
      category: 'admin',
      updatedAt: '2026-08-22T20:01:00.000Z'
    };
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    const { container, rerender } = render(
      <QueryClientProvider client={queryClient}>
        <UserModal
          isOpen={true}
          onClose={jest.fn()}
          user={employeeUser}
          stores={[mockStore]}
          onSubmit={onSubmit}
        />
      </QueryClientProvider>
    );

    expect(screen.getByLabelText('Authorization Role')).toHaveValue('employee');

    rerender(
      <QueryClientProvider client={queryClient}>
        <UserModal
          isOpen={true}
          onClose={jest.fn()}
          user={adminUser}
          stores={[mockStore]}
          onSubmit={onSubmit}
        />
      </QueryClientProvider>
    );

    expect(screen.getByLabelText('Authorization Role')).toHaveValue('admin');
    expect(container.querySelector('input[name="role"]')).toHaveValue('Admin');
  });
});
