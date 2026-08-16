'use client';

import React from 'react';
import { Landmark, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';

export interface TaxHeaderProps {
  isLoading: boolean;
  onRefresh: () => void;
  activeStoreName?: string;
}

export function TaxHeader({ isLoading, onRefresh, activeStoreName }: TaxHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              GST Compliance & Tax Reporting Ledger
            </h1>
            <p className="text-xs text-slate-400">
              Authoritative GST liability reconciliation, B2B/B2C segmentation, Input Tax Credit, and slab distribution
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <Badge variant="success" size="md">
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          100% Tax Ledger Reconciled
        </Badge>

        {activeStoreName && (
          <Badge variant="neutral" size="md">
            📍 {activeStoreName}
          </Badge>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          isLoading={isLoading}
          leftIcon={<RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh Reports
        </Button>
      </div>
    </div>
  );
}
