'use client';

import React, { useState, useEffect } from 'react';
import { History, Search, ShieldCheck, SlidersHorizontal, UserCog, Users } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useStoresQuery } from '../../../features/stores/hooks';
import {
  useRolePermissionsQuery,
  useSaveRolePermissionsMutation,
  PermissionHeader,
  PermissionMatrix,
  PERMISSION_MODULE_GROUPS,
  type RolePermissionsMatrix
} from '../../../features/permissions';
import {
  useUsersQuery,
  useSaveUserMutation,
  useSaveUserPermissionOverridesMutation,
  useUserEffectivePermissionsQuery,
  type UserCategory,
  type UserDoc
} from '../../../features/users';
import { AccessDeniedState, Badge, Button, Drawer, Input, Select, Tabs, TabsContent, TabsList, TabsTrigger, UserAvatar } from '../../../components/ui';

const roleLabels: Record<UserCategory, string> = {
  'super admin': 'Super Admin',
  admin: 'Admin',
  employee: 'Employee',
  auditor: 'Auditor'
};

function summarizeScope(user: UserDoc) {
  if (!user.assignedStoreId || user.assignedStoreId === 'all') return 'All Stores';
  return user.assignedStoreId;
}

export default function PermissionsPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const canView = hasPermission('roles.view');
  const canUpdate = hasPermission('roles.update');
  const canViewUsers = hasPermission('users.view');
  const canManageUsers = hasPermission('users.update');

  const { data: serverMatrix, isLoading } = useRolePermissionsQuery();
  const saveMutation = useSaveRolePermissionsMutation();
  const { data: users = [], isLoading: isLoadingUsers } = useUsersQuery();
  const { data: stores = [] } = useStoresQuery({ enabled: canViewUsers });
  const saveUserMutation = useSaveUserMutation();
  const saveOverrideMutation = useSaveUserPermissionOverridesMutation();

  // Local draft state for permissions editing
  const [draftMatrix, setDraftMatrix] = useState<RolePermissionsMatrix>({
    admin: [],
    employee: [],
    auditor: []
  });
  const [activeTab, setActiveTab] = useState('roles');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDoc | null>(null);
  const [draftCategory, setDraftCategory] = useState<UserCategory>('employee');
  const [draftStoreId, setDraftStoreId] = useState('all');
  const [draftGrants, setDraftGrants] = useState<string[]>([]);
  const [draftDenies, setDraftDenies] = useState<string[]>([]);
  const effectivePermissionsQuery = useUserEffectivePermissionsQuery(selectedUser?.id);

  // Sync draft state with server when loaded or updated via realtime
  useEffect(() => {
    if (serverMatrix) {
      setDraftMatrix({
        admin: serverMatrix.admin || [],
        employee: serverMatrix.employee || [],
        auditor: serverMatrix.auditor || []
      });
    }
  }, [serverMatrix]);

  useEffect(() => {
    if (!selectedUser) return;
    setDraftCategory(selectedUser.category || 'employee');
    setDraftStoreId(selectedUser.assignedStoreId || 'all');
    setDraftGrants(selectedUser.permissionGrants || []);
    setDraftDenies(selectedUser.permissionDenies || []);
  }, [selectedUser]);

  useEffect(() => {
    if (!effectivePermissionsQuery.data) return;
    setDraftGrants(effectivePermissionsQuery.data.permissionGrants || []);
    setDraftDenies(effectivePermissionsQuery.data.permissionDenies || []);
  }, [effectivePermissionsQuery.data]);

  // Check if draft has unsaved changes compared to serverMatrix
  const hasChanges = React.useMemo(() => {
    if (!serverMatrix) return false;
    const sAdm = [...(serverMatrix.admin || [])].sort().join(',');
    const dAdm = [...(draftMatrix.admin || [])].sort().join(',');
    const sEmp = [...(serverMatrix.employee || [])].sort().join(',');
    const dEmp = [...(draftMatrix.employee || [])].sort().join(',');
    const sAud = [...(serverMatrix.auditor || [])].sort().join(',');
    const dAud = [...(draftMatrix.auditor || [])].sort().join(',');
    return sAdm !== dAdm || sEmp !== dEmp || sAud !== dAud;
  }, [serverMatrix, draftMatrix]);

  if (!canView) {
    return (
      <AccessDeniedState
        title="Role Permissions Restricted"
        message="You do not have administrative privileges to inspect or modify the RBAC role permissions matrix."
        requiredPermission="roles.view"
      />
    );
  }

  const handleSave = async () => {
    await saveMutation.mutateAsync(draftMatrix);
  };

  const handleReset = () => {
    if (serverMatrix) {
      setDraftMatrix({
        admin: serverMatrix.admin || [],
        employee: serverMatrix.employee || [],
        auditor: serverMatrix.auditor || []
      });
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const query = userSearch.toLowerCase().trim();
    return (
      u.name?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query) ||
      u.role?.toLowerCase().includes(query) ||
      u.category?.toLowerCase().includes(query)
    );
  });

  const usersWithOverrides = users.filter((u) => (u.permissionGrants?.length || 0) > 0 || (u.permissionDenies?.length || 0) > 0);

  const handlePermissionOverride = (permissionId: string, mode: 'inherit' | 'grant' | 'deny') => {
    const nextGrants = draftGrants.filter((id) => id !== permissionId);
    const nextDenies = draftDenies.filter((id) => id !== permissionId);

    if (mode === 'grant') nextGrants.push(permissionId);
    if (mode === 'deny') nextDenies.push(permissionId);

    setDraftGrants(Array.from(new Set(nextGrants)));
    setDraftDenies(Array.from(new Set(nextDenies)));
  };

  const getOverrideMode = (permissionId: string) => {
    if (draftGrants.includes(permissionId)) return 'grant';
    if (draftDenies.includes(permissionId)) return 'deny';
    return 'inherit';
  };

  const handleSaveSelectedUserAccess = async () => {
    if (!selectedUser) return;

    await saveUserMutation.mutateAsync({
      id: selectedUser.id,
      name: selectedUser.name,
      username: selectedUser.username,
      email: selectedUser.email,
      phone: selectedUser.phone,
      role: selectedUser.role,
      category: draftCategory,
      assignedStoreId: draftStoreId,
      assignedStores: [draftStoreId],
      status: selectedUser.status,
      avatar: selectedUser.avatar,
      avatarUpdatedAt: selectedUser.avatarUpdatedAt,
      permissions: selectedUser.permissions || []
    });

    await saveOverrideMutation.mutateAsync({
      id: selectedUser.id,
      permissionGrants: draftGrants,
      permissionDenies: draftDenies
    });
  };

  const handleResetSelectedOverrides = () => {
    setDraftGrants([]);
    setDraftDenies([]);
  };

  const rolePermissions = effectivePermissionsQuery.data?.rolePermissions || [];
  const effectivePermissions = effectivePermissionsQuery.data?.effectivePermissions || [];

  return (
    <div className="space-y-6 pb-12">
      <Tabs defaultValue="roles" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950">Roles & Access</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage role templates separately from user-specific grants, denies, and effective access.
            </p>
          </div>
          <TabsList className="w-full overflow-x-auto lg:w-auto">
            <TabsTrigger value="roles" icon={<ShieldCheck />}>Roles</TabsTrigger>
            <TabsTrigger value="users" icon={<Users />}>Users</TabsTrigger>
            <TabsTrigger value="overrides" icon={<SlidersHorizontal />}>Overrides</TabsTrigger>
            <TabsTrigger value="audit" icon={<History />}>Audit</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="roles" className="space-y-6">
          <PermissionHeader
            hasChanges={hasChanges}
            canUpdate={canUpdate}
            onSave={handleSave}
            onReset={handleReset}
            isLoading={saveMutation.isPending}
          />

          <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl text-xs text-slate-700 shadow-xs">
            <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-slate-950 font-semibold">Super Admin Master Bypass Policy</strong>
              <p className="text-slate-600 leading-relaxed">
                Super Admin / Owner keeps permanent wildcard access. Role templates below configure Admin, Employee, and Auditor defaults.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-sm shadow-xs">
              Loading RBAC permissions matrix...
            </div>
          ) : (
            <PermissionMatrix
              matrix={draftMatrix}
              canUpdate={canUpdate}
              onChangeMatrix={setDraftMatrix}
            />
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {!canViewUsers ? (
            <AccessDeniedState
              title="User Access Restricted"
              message="You need user directory privileges to inspect individual access."
              requiredPermission="users.view"
            />
          ) : (
            <>
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Active Users</h2>
                  <p className="text-xs text-slate-500">Select a user to inspect effective permissions and user-specific overrides.</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users"
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredUsers.map((user) => {
                  const category = user.category || 'employee';
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUser(user)}
                      className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xs transition-colors hover:border-blue-200 hover:bg-blue-50/40 focus-ring"
                    >
                      <div className="flex items-start gap-3">
                        <UserAvatar user={user} size="md" shape="rounded" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-slate-950">{user.name}</p>
                            <Badge variant={category === 'admin' ? 'info' : category === 'super admin' ? 'brand' : category === 'auditor' ? 'warning' : 'neutral'} size="sm">
                              {roleLabels[category]}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate font-mono text-xs text-slate-500">@{user.username}</p>
                          <p className="mt-2 text-xs text-slate-500">{summarizeScope(user)} · {user.status}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="overrides" className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <h2 className="text-sm font-semibold text-slate-950">Users With Overrides</h2>
            <p className="mt-1 text-xs text-slate-500">Custom grants and denies are user-specific and do not modify role templates.</p>
          </div>
          <div className="space-y-2">
            {usersWithOverrides.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-xs">
                No user-specific overrides are currently configured.
              </div>
            ) : (
              usersWithOverrides.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setActiveTab('users');
                    setSelectedUser(user);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xs hover:border-blue-200 hover:bg-blue-50/40 focus-ring"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar user={user} size="sm" shape="rounded" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{user.name}</p>
                      <p className="font-mono text-xs text-slate-500">@{user.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="success" size="sm">{user.permissionGrants?.length || 0} grants</Badge>
                    <Badge variant="danger" size="sm">{user.permissionDenies?.length || 0} denies</Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <h2 className="text-sm font-semibold text-slate-950">Access Audit Boundary</h2>
            <p className="mt-1 text-xs text-slate-500">
              Role and user override saves write immutable audit events. Global audit inspection remains controlled by <code>audit.view</code>.
            </p>
            {hasPermission('audit.view') ? (
              <Button className="mt-4" variant="secondary" onClick={() => window.location.assign('/audit')}>
                Open Audit Trail
              </Button>
            ) : (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                You can edit access according to your permissions, but you cannot inspect the global audit ledger.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Drawer
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={selectedUser ? `${selectedUser.name} Access` : 'User Access'}
        description={selectedUser ? `@${selectedUser.username} · ${roleLabels[draftCategory]}` : undefined}
        maxWidth="xl"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <Button type="button" variant="ghost" onClick={handleResetSelectedOverrides} disabled={!canManageUsers}>
              Reset Overrides
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => setSelectedUser(null)}>
                Close
              </Button>
              <Button
                type="button"
                onClick={handleSaveSelectedUserAccess}
                disabled={!canManageUsers || !selectedUser}
                isLoading={saveUserMutation.isPending || saveOverrideMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </div>
        }
      >
        {selectedUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <UserAvatar user={selectedUser} size="lg" shape="circle" priority />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{selectedUser.name}</h3>
                  <Badge variant={selectedUser.status === 'active' ? 'success' : 'neutral'} size="sm">
                    {selectedUser.status?.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs font-mono text-slate-500">@{selectedUser.username}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{selectedUser.role} • {selectedUser.email || selectedUser.phone || 'No direct contact'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-medium text-slate-500">Effective</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{effectivePermissions.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-medium text-slate-500">Inherited</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{rolePermissions.length}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-[11px] font-medium text-emerald-700">Custom Grants</p>
                <p className="mt-1 text-lg font-semibold text-emerald-800">{draftGrants.length}</p>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <p className="text-[11px] font-medium text-rose-700">Custom Denies</p>
                <p className="mt-1 text-lg font-semibold text-rose-800">{draftDenies.length}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Authorization Role</span>
                <Select
                  aria-label="Authorization Role"
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value as UserCategory)}
                  disabled={!canManageUsers}
                  options={[
                    { value: 'employee', label: 'Employee' },
                    { value: 'admin', label: 'Admin' },
                    { value: 'auditor', label: 'Auditor' },
                    { value: 'super admin', label: 'Super Admin' }
                  ]}
                />
                <span className="block text-[11px] text-slate-500">
                  Controls permissions and application access. Job title remains "{selectedUser.role}".
                </span>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Store Scope</span>
                <Select
                  value={draftStoreId}
                  onChange={(e) => setDraftStoreId(e.target.value)}
                  disabled={!canManageUsers || draftCategory === 'super admin'}
                  options={[
                    { value: 'all', label: 'All Stores' },
                    ...stores.map((store) => ({ value: store.id, label: `${store.name} (${store.code || store.id})` }))
                  ]}
                />
              </label>
            </div>

            <div className="space-y-4">
              {PERMISSION_MODULE_GROUPS.map((group) => (
                <section key={group.id} className="rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <h3 className="text-xs font-semibold text-slate-900">{group.title}</h3>
                    <p className="text-[11px] text-slate-500">{group.description}</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.permissions.map((permission) => {
                      const mode = getOverrideMode(permission.id);
                      const inherited = rolePermissions.includes(permission.id);
                      return (
                        <div key={permission.id} className="grid gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-900">{permission.name}</p>
                            <p className="text-[11px] text-slate-500">
                              {inherited ? 'Inherited' : 'Not inherited'} · {permission.id}
                            </p>
                          </div>
                          <div className="inline-flex h-8 overflow-hidden rounded-md border border-slate-200 text-[11px]">
                            {(['inherit', 'grant', 'deny'] as const).map((option) => (
                              <button
                                key={option}
                                type="button"
                                disabled={!canManageUsers}
                                onClick={() => handlePermissionOverride(permission.id, option)}
                                className={[
                                  'px-2 font-medium capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                                  mode === option
                                    ? option === 'deny'
                                      ? 'bg-rose-50 text-rose-700'
                                      : option === 'grant'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-slate-100 text-slate-800'
                                    : 'bg-white text-slate-500 hover:bg-slate-50'
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
          </div>
        )}
      </Drawer>
    </div>
  );
}
