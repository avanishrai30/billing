'use client';

import React from 'react';
import { History, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';

export interface AuditHeaderProps {
  totalLoaded: number;
  isLoading: boolean;
  onRefresh: () => void;
}

export function AuditHeader({ totalLoaded, isLoading, onRefresh }: AuditHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Security & Immutable Audit Trail
            </h1>
            <p className="text-xs text-slate-400">
              Append-only ledger tracking all authentication, billing transactions, inventory movements, and security alerts
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <Badge variant="warning" size="md">
          {totalLoaded} Events Loaded
        </Badge>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          isLoading={isLoading}
          leftIcon={<RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh Ledger
        </Button>
      </div>
    </div>
  );
}
