'use client';

import React from 'react';
import { Eye, Edit2, UserX, Shield, Store } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  EmptyState,
  IconButton
} from '../../../components/ui';
import type { UserDoc } from '../types';
import type { StoreDoc } from '../../stores/types';

export interface UserTableProps {
  users: UserDoc[];
  stores: StoreDoc[];
  currentUserId?: string;
  isLoading: boolean;
  canManage: boolean;
  onViewUser: (user: UserDoc) => void;
  onEditUser: (user: UserDoc) => void;
  onDeactivateUser: (user: UserDoc) => void;
  onClearFilters?: () => void;
  isFiltered?: boolean;
}

export function UserTable({
  users,
  stores,
  currentUserId,
  isLoading,
  canManage,
  onViewUser,
  onEditUser,
  onDeactivateUser,
  onClearFilters,
  isFiltered = false
}: UserTableProps) {
  const storeMap = React.useMemo(() => {
    const map = new Map<string, StoreDoc>();
    for (const s of stores) {
      map.set(s.id, s);
    }
    return map;
  }, [stores]);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-sm shadow-xs">
        Loading user directory...
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <EmptyState
        icon={<Shield className="w-8 h-8 text-slate-400" />}
        title={isFiltered ? 'No Matching Users' : 'No Users Found'}
        description={
          isFiltered
            ? 'No user account matches your current search criteria. Try clearing search filters.'
            : 'Create your first team member user account to manage roles and store access.'
        }
        actionLabel={isFiltered ? 'Reset Filters' : undefined}
        onAction={isFiltered ? onClearFilters : undefined}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <Table density="dense">
        <TableHeader>
          <tr>
            <TableHead>User Profile</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Role / Category</TableHead>
            <TableHead>Assigned Store Scope</TableHead>
            <TableHead align="center">Status</TableHead>
            <TableHead align="right">Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            const storeObj = user.assignedStoreId && user.assignedStoreId !== 'all' ? storeMap.get(user.assignedStoreId) : null;
            const initials = (user.name || user.username || 'U')
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            const category = user.category || 'employee';
            const categoryLabel =
              category === 'super admin'
                ? 'Super Admin'
                : category === 'admin'
                  ? 'Admin'
                  : category === 'auditor'
                    ? 'Auditor'
                    : 'Employee';
            const categoryVariant =
              category === 'super admin'
                ? 'brand'
                : category === 'admin'
                  ? 'info'
                  : category === 'auditor'
                    ? 'warning'
                    : 'neutral';

            return (
              <TableRow key={user.id}>
                {/* User Profile */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                      {initials}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-xs truncate max-w-[180px]" title={user.name}>
                        {user.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate max-w-[180px]">
                        {user.email || user.phone || '—'}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Username */}
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-semibold">
                      @{user.username}
                    </code>
                    {isSelf && (
                      <span className="text-[10px] text-emerald-700 font-bold tracking-wider">
                        (YOU)
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Role / Category */}
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-xs text-slate-900">{categoryLabel}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant={categoryVariant} size="sm">
                        {user.role || 'Team Member'}
                      </Badge>
                    </div>
                  </div>
                </TableCell>

                {/* Store Scope */}
                <TableCell>
                  {user.assignedStoreId === 'all' || !user.assignedStoreId ? (
                    <div className="flex items-center gap-1 text-xs text-slate-700">
                      <span className="text-emerald-600">🌐</span> All Stores (Global)
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-amber-700 font-medium">
                      <Store className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span className="truncate max-w-[150px]" title={storeObj?.name || user.assignedStoreId}>
                        {storeObj?.name || user.assignedStoreId}
                      </span>
                    </div>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell align="center">
                  {user.status === 'active' ? (
                    <Badge variant="success" size="sm" dot>
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="danger" size="sm" dot>
                      Suspended
                    </Badge>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell align="right">
                  <div className="flex items-center justify-end gap-1">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewUser(user)}
                      aria-label={`View user details for ${user.name}`}
                      icon={<Eye className="h-4 w-4 text-blue-600" />}
                    />
                    {canManage && (
                      <>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditUser(user)}
                          aria-label={`Edit user ${user.name}`}
                          icon={<Edit2 className="h-4 w-4 text-slate-600" />}
                        />
                        {!isSelf && (
                          <IconButton
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeactivateUser(user)}
                            aria-label={`Deactivate user ${user.name}`}
                            icon={<UserX className="h-4 w-4 text-rose-600" />}
                          />
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
