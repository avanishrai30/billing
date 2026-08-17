'use client';

import React from 'react';
import { Building2, Edit } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';

export interface BusinessHeaderProps {
  canEdit: boolean;
  onOpenEdit: () => void;
}

export function BusinessHeader({ canEdit, onOpenEdit }: BusinessHeaderProps) {
  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center text-purple-400 flex-shrink-0">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Business & Legal Entity Profile
            </h1>
            <Badge variant="info" size="sm">
              TENANT MASTER
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Legal business details, tax identifiers, banking credentials, and default invoice headers
          </p>
        </div>
      </div>

      {canEdit && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenEdit}
          leftIcon={<Edit className="w-3.5 h-3.5" />}
        >
          Edit Business Profile
        </Button>
      )}
    </div>
  );
}
