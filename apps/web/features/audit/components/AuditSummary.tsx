'use client';

import React from 'react';
import { History, ShieldCheck, ShoppingCart, Database, AlertTriangle } from 'lucide-react';
import { StatCard } from '../../../components/ui';
import type { AuditSummaryMetrics } from '../types';

export interface AuditSummaryProps {
  metrics: AuditSummaryMetrics;
  isLoading?: boolean;
}

export function AuditSummary({ metrics, isLoading = false }: AuditSummaryProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        label="Total Events Loaded"
        value={isLoading ? '...' : metrics.totalEvents}
        subtext="Immutable database ledger"
        icon={<History className="h-4 w-4 text-amber-400" />}
      />

      <StatCard
        label="Auth & Login Events"
        value={isLoading ? '...' : metrics.authEvents}
        subtext="Session authentications"
        icon={<ShieldCheck className="h-4 w-4 text-sky-400" />}
      />

      <StatCard
        label="POS Sales & Checkouts"
        value={isLoading ? '...' : metrics.billingEvents}
        subtext="Finalized transactions"
        icon={<ShoppingCart className="h-4 w-4 text-emerald-400" />}
      />

      <StatCard
        label="Security Alerts & Denials"
        value={isLoading ? '...' : metrics.securityAlerts}
        subtext={metrics.securityAlerts > 0 ? 'Access denied alerts recorded' : 'Zero violations'}
        icon={<AlertTriangle className="h-4 w-4 text-rose-400" />}
      />
    </div>
  );
}
