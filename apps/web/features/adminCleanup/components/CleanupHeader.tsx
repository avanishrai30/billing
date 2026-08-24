'use client';

import React from 'react';
import { ShieldAlert, Trash2, History, RotateCcw, Boxes, Receipt, Package, Truck } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import type { CleanupDomain, CleanupDomainSummary } from '../types';

export interface CleanupHeaderProps {
  summary?: CleanupDomainSummary;
  selectedDomain: CleanupDomain;
  onSelectDomain: (d: CleanupDomain) => void;
  onOpenHistory: () => void;
}

export function CleanupHeader({
  summary,
  selectedDomain,
  onSelectDomain,
  onOpenHistory
}: CleanupHeaderProps) {
  const domainTabs: { id: CleanupDomain; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: 'invoices', label: 'Invoices & Sales', icon: Receipt, count: summary?.invoices?.potentialCleanup },
    { id: 'purchases', label: 'Procurement', icon: Truck, count: summary?.purchases?.potentialCleanup },
    { id: 'products', label: 'Products Master', icon: Package, count: summary?.products?.potentialCleanup },
    { id: 'inventory', label: 'Inventory Stock', icon: Boxes, count: summary?.inventory?.potentialCleanup }
  ];

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Cleanup & Maintenance Center
              </h1>
              <Badge variant="danger" size="sm">
                SUPER ADMIN ONLY
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
              Execute controlled administrative maintenance, batch archiving, test-record purging, and stock reconciliation with safety previews and rollback manifests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 text-slate-800 bg-white hover:bg-slate-100 border-none cursor-pointer font-medium"
          >
            <History className="w-4 h-4 text-slate-600" />
            Audit & Operation History
          </Button>
        </div>
      </div>

      {/* Domain Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {domainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedDomain === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectDomain(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
