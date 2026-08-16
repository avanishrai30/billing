'use client';

import React from 'react';
import { Eye, ShieldAlert, Store, Clock, User } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  EmptyState,
  IconButton
} from '../../../components/ui';
import { AuditEventBadge } from './AuditEventBadge';
import type { AuditLogDoc } from '../types';

export interface AuditTableProps {
  logs: AuditLogDoc[];
  isLoading: boolean;
  onViewLog: (log: AuditLogDoc) => void;
  onClearFilters?: () => void;
  isFiltered?: boolean;
}

export function AuditTable({
  logs,
  isLoading,
  onViewLog,
  onClearFilters,
  isFiltered = false
}: AuditTableProps) {
  if (isLoading) {
    return (
      <div className="bg-[#021b47] border border-white/10 rounded-2xl p-6 text-center text-slate-400 text-sm">
        Loading immutable audit ledger...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={<ShieldAlert className="w-8 h-8 text-slate-400" />}
        title={isFiltered ? 'No Matching Audit Logs' : 'No Audit Activity Recorded'}
        description={
          isFiltered
            ? 'No audit log matches your current query filters. Try adjusting date or event filters.'
            : 'Operational mutations, sales, and authentications will automatically appear in this immutable ledger.'
        }
        actionLabel={isFiltered ? 'Reset Filters' : undefined}
        onAction={isFiltered ? onClearFilters : undefined}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#021b47]">
      <Table density="dense">
        <TableHeader>
          <tr>
            <TableHead>Timestamp</TableHead>
            <TableHead>Event & Action</TableHead>
            <TableHead>Entity / Target ID</TableHead>
            <TableHead>Actor & Role</TableHead>
            <TableHead>Store Scope</TableHead>
            <TableHead>Event Summary</TableHead>
            <TableHead align="right">Action</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {logs.map((log, idx) => {
            const rowKey = log._id || `${log.requestId}-${log.timestamp}-${idx}`;
            const dateObj = new Date(log.timestamp);
            const dateFormatted = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                })
              : log.timestamp;

            return (
              <TableRow key={rowKey}>
                {/* Timestamp */}
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono tabular-nums whitespace-nowrap">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{dateFormatted}</span>
                  </div>
                </TableCell>

                {/* Event & Action */}
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <AuditEventBadge eventType={log.eventType} action={log.action} />
                    <span className="text-[10px] font-mono text-slate-400 uppercase">({log.action})</span>
                  </div>
                </TableCell>

                {/* Entity / Target ID */}
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-white capitalize">{log.entity || 'System'}</span>
                    <code className="text-[10px] font-mono text-sky-300 bg-black/30 px-1 py-0.5 rounded border border-white/5 truncate max-w-[140px]" title={log.entityId}>
                      {log.entityId || '—'}
                    </code>
                  </div>
                </TableCell>

                {/* Actor & Role */}
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-200">
                      <User className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[150px]" title={log.user || log.performedBy}>
                        {log.user || log.performedBy || 'System'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400/90 tracking-wider">
                      {log.role || 'SYSTEM'}
                    </span>
                  </div>
                </TableCell>

                {/* Store Scope */}
                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-slate-300">
                    <Store className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="truncate max-w-[130px]" title={log.businessName || log.businessId}>
                      {log.businessName || log.businessId || 'All Outlets'}
                    </span>
                  </div>
                </TableCell>

                {/* Event Summary */}
                <TableCell>
                  <p className="text-xs text-slate-300 line-clamp-2 max-w-[280px]" title={log.details}>
                    {log.details || log.eventType}
                  </p>
                </TableCell>

                {/* Action Button */}
                <TableCell align="right">
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewLog(log)}
                    aria-label={`Inspect audit log details for ${log.eventType}`}
                    icon={<Eye className="h-4 w-4 text-sky-400" />}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
