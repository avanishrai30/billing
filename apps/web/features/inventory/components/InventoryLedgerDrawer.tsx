'use client';

import React, { useState } from 'react';
import { History, ArrowDownRight, ArrowUpRight, Filter } from 'lucide-react';
import { Drawer, Badge, Skeleton, EmptyState } from '../../../components/ui';
import { useInventoryLogsQuery } from '../hooks';
import { getMovementTypeBadgeConfig } from '../calculations';
import type { InventoryBalance, MovementType } from '../types';

export interface InventoryLedgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryBalance | null;
}

export function InventoryLedgerDrawer({
  isOpen,
  onClose,
  item
}: InventoryLedgerDrawerProps) {
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const { data: logsResponse, isLoading } = useInventoryLogsQuery({
    productId: item?.productId,
    locationId: item?.locationId === 'all' ? undefined : item?.locationId,
    type: selectedType === 'ALL' ? undefined : selectedType,
    limit: 100
  });

  const logs = logsResponse?.data || [];

  const typeOptions = [
    { value: 'ALL', label: 'All Movements' },
    { value: 'SALE', label: 'POS Sales' },
    { value: 'PURCHASE', label: 'Purchases' },
    { value: 'TRANSFER_IN', label: 'Transfers In' },
    { value: 'TRANSFER_OUT', label: 'Transfers Out' },
    { value: 'MANUAL_ADJUSTMENT', label: 'Adjustments' },
    { value: 'DAMAGE', label: 'Damage / Loss' }
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Inventory Movement Ledger"
      description={
        item
          ? `Immutable audit trail for ${item.productName || item.productId} (${item.sku || 'No SKU'})`
          : 'Immutable stock movement audit trail'
      }
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Type Filter Bar */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#021b47] border border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            <span>Filter Type:</span>
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 bg-[#032154] border border-white/15 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ledger List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#021b47] border border-white/10 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <Skeleton variant="text" className="w-28 h-4" />
                  <Skeleton variant="text" className="w-20 h-4" />
                </div>
                <Skeleton variant="text" className="w-full h-3" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<History className="w-8 h-8 text-slate-400" />}
            title="No Movement Logs Recorded"
            description="No ledger movement entries match your selected criteria. Movements generated via sales, purchases, or adjustments will appear here."
          />
        ) : (
          <div className="space-y-2.5">
            {logs.map((log) => {
              const badge = getMovementTypeBadgeConfig(log.type);
              const isPositive = log.quantity > 0;
              const formattedDate = new Date(log.createdAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
              });

              return (
                <div
                  key={log._id || log.movementId}
                  className="p-3.5 rounded-xl bg-[#021b47] border border-white/10 space-y-2 text-xs"
                >
                  {/* Top Row: Movement Type + Delta */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={badge.variant} size="sm">
                        {badge.label}
                      </Badge>
                      <span className="font-mono text-slate-400 text-[11px]">
                        Ref: {log.referenceId}
                      </span>
                    </div>

                    <div
                      className={`flex items-center gap-1 font-mono font-bold text-sm tabular-nums ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span>
                        {isPositive ? `+${log.quantity}` : log.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Progression: Before -> After */}
                  <div className="flex items-center justify-between text-[11px] bg-white/5 rounded-lg px-2.5 py-1.5 text-slate-300 font-mono">
                    <span>Balance: {log.beforeQuantity}</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-white font-bold">New: {log.afterQuantity}</span>
                    <span className="text-slate-400">({log.locationId})</span>
                  </div>

                  {/* Footer metadata: User, Notes, Date */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span className="truncate max-w-[200px]">
                      By: <strong className="text-slate-300">{log.performedBy}</strong>
                      {log.notes ? ` • ${log.notes}` : ''}
                    </span>
                    <span className="flex-shrink-0 font-mono">{formattedDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Drawer>
  );
}
