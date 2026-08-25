'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useStoresQuery } from '../../../features/stores/hooks';
import {
  useUsersQuery,
  useSaveUserMutation,
  useDeactivateUserMutation,
  UserHeader,
  UserSummaryCards,
  UserFilters,
  UserTable,
  UserModal,
  UserDetailDrawer,
  UserDeactivateDialog,
  type UserDoc,
  type UserCategory,
  type UserStatus,
  type UserFormValues,
  type UserSummaryMetrics
} from '../../../features/users';
import { AccessDeniedState, useToast } from '../../../components/ui';
import { ApiError } from '../../../lib/errors/types';

const roleLabels: Record<UserCategory, string> = {
  'super admin': 'Super Admin',
  admin: 'Admin',
  employee: 'Employee',
  auditor: 'Auditor'
};

export default function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const { success, error: toastError } = useToast();
  const canView = hasPermission('users.view');
  const canCreate = hasPermission('users.create') || hasPermission('users.update');
  const canManage = hasPermission('users.update') || hasPermission('users.create');

  // Queries
  const { data: users = [], isLoading: isLoadingUsers } = useUsersQuery();
  const { data: stores = [] } = useStoresQuery();

  // Mutations
  const saveMutation = useSaveUserMutation();
  const deactivateMutation = useDeactivateUserMutation();

  // Filter States
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | UserCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');

  // Modal / Drawer States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Summary Metrics
  const metrics: UserSummaryMetrics = useMemo(() => {
    let activeUsers = 0;
    let suspendedUsers = 0;
    let superAdmins = 0;
    let admins = 0;
    let employees = 0;
    let auditors = 0;

    for (const u of users) {
      if (u.status === 'active') activeUsers++;
      else suspendedUsers++;

      const cat = u.category || 'employee';
      if (cat === 'super admin') superAdmins++;
      else if (cat === 'admin') admins++;
      else if (cat === 'auditor') auditors++;
      else employees++;
    }

    return {
      totalUsers: users.length,
      activeUsers,
      suspendedUsers,
      superAdmins,
      admins,
      employees,
      auditors
    };
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesCategory = categoryFilter === 'ALL' || u.category === categoryFilter;
      if (!matchesCategory) return false;

      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
      if (!matchesStatus) return false;

      if (!search.trim()) return true;
      const query = search.toLowerCase().trim();
      return (
        u.name?.toLowerCase().includes(query) ||
        u.username?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.phone?.toLowerCase().includes(query) ||
        u.role?.toLowerCase().includes(query)
      );
    });
  }, [users, search, categoryFilter, statusFilter]);

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  if (!canView) {
    return (
      <AccessDeniedState
        title="User Management Restricted"
        message="You do not have administrative privileges to view team user accounts or directory credentials."
        requiredPermission="users.view"
      />
    );
  }

  // Handlers
  const handleOpenAddUser = () => {
    setSelectedUserId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditUser = (user: UserDoc) => {
    setSelectedUserId(user.id);
    setIsModalOpen(true);
  };

  const handleOpenDetail = (user: UserDoc) => {
    setSelectedUserId(user.id);
    setIsDetailOpen(true);
  };

  const handleOpenDeactivate = (user: UserDoc) => {
    setSelectedUserId(user.id);
    setIsDeactivateOpen(true);
  };

  const handleSaveUser = async (values: UserFormValues) => {
    try {
      const previousCategory = selectedUser?.category;
      const response = await saveMutation.mutateAsync(values);
      const savedCategory = response.user.category || values.category || 'employee';
      setSelectedUserId(response.user.id);

      if (previousCategory && previousCategory !== savedCategory) {
        success(`Authorization role updated to ${roleLabels[savedCategory]}`);
        return;
      }

      success(selectedUser ? 'User account updated' : 'User account created');
    } catch (err) {
      const apiError = err instanceof ApiError ? err : null;
      const message = apiError?.code === 'USER_EMAIL_ALREADY_EXISTS'
        ? `${apiError.message} Use a different email or leave Email Address empty.`
        : (err instanceof Error ? err.message : 'Unable to save user account.');
      toastError('User Save Failed', message);
      throw err;
    }
  };

  const handleConfirmDeactivate = async () => {
    if (selectedUser?.id) {
      await deactivateMutation.mutateAsync(selectedUser.id);
      setIsDeactivateOpen(false);
      setSelectedUserId(null);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <UserHeader
        totalUsers={metrics.totalUsers}
        activeUsers={metrics.activeUsers}
        canCreate={canCreate}
        onAddUser={handleOpenAddUser}
      />

      {/* KPI Cards */}
      <UserSummaryCards metrics={metrics} isLoading={isLoadingUsers} />

      {/* Filters */}
      <UserFilters
        search={search}
        onSearchChange={setSearch}
        category={categoryFilter}
        onCategoryChange={setCategoryFilter}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        onReset={handleResetFilters}
      />

      {/* Directory Table */}
      <UserTable
        users={filteredUsers}
        stores={stores}
        currentUserId={currentUser?.id}
        isLoading={isLoadingUsers}
        canManage={canManage}
        onViewUser={handleOpenDetail}
        onEditUser={handleOpenEditUser}
        onDeactivateUser={handleOpenDeactivate}
        onClearFilters={handleResetFilters}
        isFiltered={search !== '' || categoryFilter !== 'ALL' || statusFilter !== 'ALL'}
      />

      {/* Create / Edit User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        stores={stores}
        onSubmit={handleSaveUser}
        isLoading={saveMutation.isPending}
      />

      {/* User Detail Drawer */}
      <UserDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        user={selectedUser}
        stores={stores}
        canManage={canManage}
        onEdit={(u) => {
          setIsDetailOpen(false);
          handleOpenEditUser(u);
        }}
        onDeactivate={(u) => {
          setIsDetailOpen(false);
          handleOpenDeactivate(u);
        }}
      />

      {/* Deactivate User Confirmation Dialog */}
      <UserDeactivateDialog
        isOpen={isDeactivateOpen}
        onClose={() => setIsDeactivateOpen(false)}
        user={selectedUser}
        onConfirm={handleConfirmDeactivate}
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}
