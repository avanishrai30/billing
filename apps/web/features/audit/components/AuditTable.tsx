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
  const [isMobileLayout, setIsMobileLayout] = React.useState(false);

  React.useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncLayout = () => setIsMobileLayout(mediaQuery.matches);

    syncLayout();
    mediaQuery.addEventListener('change', syncLayout);
    return () => mediaQuery.removeEventListener('change', syncLayout);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-sm shadow-xs">
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
    <>
      {isMobileLayout && (
      <div className="space-y-3">
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
            <article key={rowKey} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <AuditEventBadge eventType={log.eventType} action={log.action} />
                    <span className="text-[10px] font-mono text-slate-500 uppercase">({log.action})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{dateFormatted}</span>
                  </div>
                </div>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewLog(log)}
                  aria-label={`Inspect audit log details for ${log.eventType}`}
                  icon={<Eye className="h-4 w-4 text-blue-600" />}
                />
              </div>
              <p className="mt-3 text-xs text-slate-700 leading-relaxed line-clamp-2">{log.details || log.eventType}</p>
              <div className="mt-3 grid grid-cols-1 gap-1.5 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium text-slate-900">{log.user || log.performedBy || 'System'}</span>
                  <span className="text-amber-700">{log.role || 'SYSTEM'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 text-amber-600" />
                  <span>{log.businessName || log.businessId || 'All Outlets'}</span>
                </div>
                <code className="w-fit max-w-full rounded border border-blue-100 bg-blue-50 px-1 py-0.5 font-mono text-[10px] text-blue-700 break-all">
                  {log.entity || 'System'} / {log.entityId || 'N/A'}
                </code>
              </div>
            </article>
          );
        })}
      </div>
      )}

      {!isMobileLayout && (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
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
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-mono tabular-nums whitespace-nowrap">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{dateFormatted}</span>
                  </div>
                </TableCell>

                {/* Event & Action */}
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <AuditEventBadge eventType={log.eventType} action={log.action} />
                    <span className="text-[10px] font-mono text-slate-500 uppercase">({log.action})</span>
                  </div>
                </TableCell>

                {/* Entity / Target ID */}
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-slate-900 capitalize">{log.entity || 'System'}</span>
                    <code className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1 py-0.5 rounded border border-blue-100 truncate max-w-[140px]" title={log.entityId}>
                      {log.entityId || 'N/A'}
                    </code>
                  </div>
                </TableCell>

                {/* Actor & Role */}
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-900">
                      <User className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[150px]" title={log.user || log.performedBy}>
                        {log.user || log.performedBy || 'System'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700">
                      {log.role || 'SYSTEM'}
                    </span>
                  </div>
                </TableCell>

                {/* Store Scope */}
                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-slate-700">
                    <Store className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="truncate max-w-[130px]" title={log.businessName || log.businessId}>
                      {log.businessName || log.businessId || 'All Outlets'}
                    </span>
                  </div>
                </TableCell>

                {/* Event Summary */}
                <TableCell>
                  <p className="text-xs text-slate-600 line-clamp-2 max-w-[280px]" title={log.details}>
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
                    icon={<Eye className="h-4 w-4 text-blue-600" />}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
      )}
    </>
  );
}
