'use client';

import React from 'react';
import { ShieldAlert, Save, RotateCcw, Users } from 'lucide-react';
import Link from 'next/link';
import { Button, Badge } from '../../../components/ui';

export interface PermissionHeaderProps {
  hasChanges: boolean;
  canUpdate: boolean;
  onSave: () => void;
  onReset: () => void;
  isLoading?: boolean;
}

export function PermissionHeader({
  hasChanges,
  canUpdate,
  onSave,
  onReset,
  isLoading = false
}: PermissionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Role-Based Access Control (RBAC) Matrix
            </h1>
            <p className="text-xs text-slate-500">
              Configure fine-grained module visibility and mutation privileges for each authorization role
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <Link href="/users">
          <Button variant="outline" size="sm" leftIcon={<Users className="h-4 w-4 text-sky-400" />}>
            User Directory
          </Button>
        </Link>

        {hasChanges && (
          <Button variant="ghost" size="sm" onClick={onReset} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
            Discard Changes
          </Button>
        )}

        {canUpdate && (
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            disabled={!hasChanges}
            isLoading={isLoading}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save RBAC Matrix
          </Button>
        )}
      </div>
    </div>
  );
}
