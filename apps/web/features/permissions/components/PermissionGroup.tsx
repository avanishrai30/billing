'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { PermissionModuleGroup } from '../types';

export interface PermissionGroupProps {
  group: PermissionModuleGroup;
  selectedPermissions: string[];
  disabled?: boolean;
  onTogglePermission: (permissionId: string) => void;
  onToggleGroup: (permissionIds: string[], selectAll: boolean) => void;
}

export function PermissionGroup({
  group,
  selectedPermissions,
  disabled = false,
  onTogglePermission,
  onToggleGroup
}: PermissionGroupProps) {
  const groupPermissionIds = group.permissions.map((p) => p.id);
  const activeCount = groupPermissionIds.filter((id) => selectedPermissions.includes(id)).length;
  const isAllSelected = activeCount === groupPermissionIds.length;
  const isPartiallySelected = activeCount > 0 && !isAllSelected;

  return (
    <div className="bg-[#021b47] rounded-xl border border-white/10 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">{group.title}</h4>
            <span className="text-[10px] text-slate-400 font-mono">
              ({activeCount}/{groupPermissionIds.length} enabled)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{group.description}</p>
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={() => onToggleGroup(groupPermissionIds, !isAllSelected)}
            className="text-[11px] font-bold text-sky-400 hover:text-sky-300 transition-colors self-start sm:self-auto cursor-pointer"
          >
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {group.permissions.map((perm) => {
          const isChecked = selectedPermissions.includes(perm.id);

          return (
            <label
              key={perm.id}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors cursor-pointer select-none ${
                isChecked
                  ? 'bg-sky-500/10 border-sky-500/30 text-white'
                  : 'bg-black/20 border-white/5 text-slate-400 hover:bg-black/30'
              } ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <div
                className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                  isChecked
                    ? 'bg-sky-500 border-sky-400 text-black'
                    : 'bg-black/40 border-white/20'
                }`}
              >
                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
              </div>

              <input
                type="checkbox"
                checked={isChecked}
                disabled={disabled}
                onChange={() => onTogglePermission(perm.id)}
                className="sr-only"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold">{perm.name}</span>
                  <code className="text-[10px] font-mono text-slate-400 bg-black/30 px-1 py-0.5 rounded">
                    {perm.id}
                  </code>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{perm.description}</p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
