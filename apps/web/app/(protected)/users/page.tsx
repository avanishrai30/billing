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

export default function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth();
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
  const [activeUser, setActiveUser] = useState<UserDoc | null>(null);

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

  // Handlers
  const handleOpenAddUser = () => {
    setActiveUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEditUser = (user: UserDoc) => {
    setActiveUser(user);
    setIsModalOpen(true);
  };

  const handleOpenDetail = (user: UserDoc) => {
    setActiveUser(user);
    setIsDetailOpen(true);
  };

  const handleOpenDeactivate = (user: UserDoc) => {
    setActiveUser(user);
    setIsDeactivateOpen(true);
  };

  const handleSaveUser = async (values: UserFormValues) => {
    await saveMutation.mutateAsync(values);
  };

  const handleConfirmDeactivate = async () => {
    if (activeUser?.id) {
      await deactivateMutation.mutateAsync(activeUser.id);
      setIsDeactivateOpen(false);
      setActiveUser(null);
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
        user={activeUser}
        stores={stores}
        onSubmit={handleSaveUser}
        isLoading={saveMutation.isPending}
      />

      {/* User Detail Drawer */}
      <UserDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        user={activeUser}
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
        user={activeUser}
        onConfirm={handleConfirmDeactivate}
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}
