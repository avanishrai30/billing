'use client';

import React from 'react';
import { Users, UserCheck, Shield, Store } from 'lucide-react';
import { StatCard } from '../../../components/ui';
import type { UserSummaryMetrics } from '../types';

export interface UserSummaryCardsProps {
  metrics: UserSummaryMetrics;
  isLoading?: boolean;
}

export function UserSummaryCards({ metrics, isLoading = false }: UserSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        label="Total Accounts"
        value={isLoading ? '...' : metrics.totalUsers}
        subtext="Registered system users"
        icon={<Users className="h-4 w-4 text-sky-400" />}
      />

      <StatCard
        label="Active Users"
        value={isLoading ? '...' : `${metrics.activeUsers} / ${metrics.totalUsers}`}
        subtext={metrics.suspendedUsers > 0 ? `${metrics.suspendedUsers} suspended` : 'All accounts active'}
        icon={<UserCheck className="h-4 w-4 text-emerald-400" />}
      />

      <StatCard
        label="Super Admins / Admins"
        value={isLoading ? '...' : `${metrics.superAdmins} Super / ${metrics.admins} Admin`}
        subtext="Privileged management"
        icon={<Shield className="h-4 w-4 text-purple-400" />}
      />

      <StatCard
        label="Store Staff & Auditors"
        value={isLoading ? '...' : `${metrics.employees} Staff / ${metrics.auditors} Auditor`}
        subtext="Store-scoped operations"
        icon={<Store className="h-4 w-4 text-amber-400" />}
      />
    </div>
  );
}
