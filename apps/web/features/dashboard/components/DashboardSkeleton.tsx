'use client';

import React from 'react';
import { Skeleton, Card } from '../../../components/ui';

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse" aria-label="Loading dashboard metrics">
      {/* Primary KPI Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 bg-[#111827] border border-white/10 rounded-xl space-y-3">
            <Skeleton height={14} width={120} />
            <Skeleton height={28} width={160} />
            <Skeleton height={12} width={100} />
          </div>
        ))}
      </div>

      {/* Secondary Operational KPIs (4 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 bg-[#111827] border border-white/10 rounded-xl space-y-2">
            <Skeleton height={12} width={90} />
            <Skeleton height={22} width={70} />
            <Skeleton height={10} width={110} />
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <Card variant="default">
        <div className="space-y-4">
          <Skeleton height={20} width={280} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
            <div className="space-y-4">
              <Skeleton height={14} width={180} />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton height={12} width={120} />
                      <Skeleton height={12} width={80} />
                    </div>
                    <Skeleton height={10} className="w-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton height={14} width={180} />
              <div className="p-4 rounded-xl bg-[#0f172a] border border-white/10 space-y-4">
                <Skeleton height={16} width={200} />
                <Skeleton height={12} className="w-full" />
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Skeleton height={12} width={100} />
                  <Skeleton height={12} width={100} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Low Stock Watchlist */}
      <Card variant="default">
        <div className="space-y-4">
          <Skeleton height={20} width={240} />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={36} className="w-full" />
            ))}
          </div>
        </div>
      </Card>

      {/* Dual Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="default">
          <div className="space-y-4">
            <Skeleton height={20} width={180} />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={32} className="w-full" />
              ))}
            </div>
          </div>
        </Card>
        <Card variant="default">
          <div className="space-y-4">
            <Skeleton height={20} width={180} />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={32} className="w-full" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
