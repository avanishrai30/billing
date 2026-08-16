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
  const roles: Array<{ id: MatrixRole; label: string; icon: React.ReactNode; color: string }> = [
    {
      id: 'admin',
      label: 'Admin',
      icon: <Shield className="h-4 w-4 text-purple-400" />,
      color: 'purple'
    },
    {
      id: 'employee',
      label: 'Employee / Cashier',
      icon: <UserCheck className="h-4 w-4 text-emerald-400" />,
      color: 'emerald'
    },
    {
      id: 'auditor',
      label: 'Auditor',
      icon: <Eye className="h-4 w-4 text-amber-400" />,
      color: 'amber'
    }
  ];

  return (
    <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
      {roles.map((r) => {
        const isActive = activeRole === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChangeRole(r.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
              isActive
                ? 'bg-white/10 text-white border-white/20 shadow-xs'
                : 'bg-black/20 text-slate-400 border-white/5 hover:text-white hover:bg-white/5'
            }`}
          >
            {r.icon}
            <span>{r.label}</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 text-slate-300 font-mono">
              {permissionCounts[r.id] || 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
