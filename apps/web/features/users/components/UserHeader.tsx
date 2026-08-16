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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              User Accounts & Team Management
            </h1>
            <p className="text-xs text-slate-400">
              Manage user credentials, role categories, store scoping, and account statuses
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
