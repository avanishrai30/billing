'use client';

import React from 'react';
import { Shield, UserCheck, Eye } from 'lucide-react';
import type { MatrixRole } from '../types';

export interface RoleTabsProps {
  activeRole: MatrixRole;
  onChangeRole: (role: MatrixRole) => void;
  permissionCounts: Record<MatrixRole, number>;
}

export function RoleTabs({
  activeRole,
  onChangeRole,
  permissionCounts
}: RoleTabsProps) {
  const roles: Array<{ id: MatrixRole; label: string; icon: React.ReactNode }> = [
    {
      id: 'admin',
      label: 'Admin',
      icon: <Shield className="h-4 w-4" />
    },
    {
      id: 'employee',
      label: 'Employee / Cashier',
      icon: <UserCheck className="h-4 w-4" />
    },
    {
      id: 'auditor',
      label: 'Auditor',
      icon: <Eye className="h-4 w-4" />
    }
  ];

  return (
    <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
      {roles.map((r) => {
        const isActive = activeRole === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChangeRole(r.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
              isActive
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            {r.icon}
            <span>{r.label}</span>
            <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              isActive ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {permissionCounts[r.id] || 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
