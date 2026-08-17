'use client';

import React from 'react';
import { Users, UserPlus } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';

export interface CustomerHeaderProps {
  canCreate: boolean;
  onOpenCreate: () => void;
}

export function CustomerHeader({ canCreate, onOpenCreate }: CustomerHeaderProps) {
  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
      {/* Title & Description */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 flex-shrink-0">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Customer CRM Directory
            </h1>
            <Badge variant="success" size="sm" dot>
              REALTIME
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Central customer identity, contact information, GST tax profiles, and invoice history
          </p>
        </div>
      </div>

      {/* Action Button */}
      {canCreate && (
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenCreate}
          leftIcon={<UserPlus className="w-3.5 h-3.5" />}
        >
          Register Customer
        </Button>
      )}
    </div>
  );
}
