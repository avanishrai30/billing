'use client';

import React from 'react';
import { Users, UserPlus, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Button, Badge } from '../../../components/ui';

export interface UserHeaderProps {
  totalUsers: number;
  activeUsers: number;
  canCreate: boolean;
  onAddUser: () => void;
}

export function UserHeader({
  totalUsers,
  activeUsers,
  canCreate,
  onAddUser
}: UserHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              User Accounts & Team Management
            </h1>
            <p className="text-xs text-slate-500">
              Manage user credentials, authorization roles, store scoping, and account statuses
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <Badge variant="info" size="md">
          {totalUsers} Accounts ({activeUsers} Active)
        </Badge>

        <Link href="/permissions">
          <Button variant="outline" size="sm" leftIcon={<ShieldAlert className="h-4 w-4 text-amber-400" />}>
            RBAC Matrix
          </Button>
        </Link>

        {canCreate && (
          <Button
            variant="primary"
            size="sm"
            onClick={onAddUser}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Add New User
          </Button>
        )}
      </div>
    </div>
  );
}
