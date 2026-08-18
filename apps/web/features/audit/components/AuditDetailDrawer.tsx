'use client';

import React from 'react';
import { User, Shield, Store, Globe, Network, Calendar, FileText } from 'lucide-react';
import { Drawer, Button, Badge } from '../../../components/ui';
import { AuditEventBadge } from './AuditEventBadge';
import { AuditPayloadViewer } from './AuditPayloadViewer';
import type { AuditLogDoc } from '../types';

export interface AuditDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLogDoc | null;
}

export function AuditDetailDrawer({ isOpen, onClose, log }: AuditDetailDrawerProps) {
  if (!log) return null;

  const dateFormatted = new Date(log.timestamp).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Audit Event Details"
      description={`Request ID: ${log.requestId || 'N/A'}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end w-full">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close Inspection
          </Button>
        </div>
      }
    >
      <div className="space-y-6 py-2 overflow-y-auto">
        {/* Event Header Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 flex-wrap">
            <AuditEventBadge eventType={log.eventType} action={log.action} size="md" />
            <Badge variant="neutral">ACTION: {log.action.toUpperCase()}</Badge>
            <Badge variant="neutral">VIEW: {log.view.toUpperCase()}</Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
            <Calendar className="h-3.5 w-3.5" />
            <span>{dateFormatted}</span>
          </div>
        </div>

        {/* Human-Readable Details */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <FileText className="h-4 w-4 text-amber-600" />
            <span>Event Summary Details</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {log.details || log.eventType}
          </p>
        </div>

        {/* Actor & Attribution Metadata */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h4 className="text-xs font-semibold text-slate-900">
            Actor & Security Attribution
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <User className="h-4 w-4 text-slate-400 shrink-0" />
              <span>
                Actor: <strong className="text-slate-950">{log.user || log.performedBy}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <Shield className="h-4 w-4 text-slate-400 shrink-0" />
              <span>
                Role: <strong className="text-amber-700">{log.role || 'SYSTEM'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <Store className="h-4 w-4 text-slate-400 shrink-0" />
              <span>
                Store: <strong className="text-slate-950">{log.businessName || log.businessId}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <Globe className="h-4 w-4 text-slate-400 shrink-0" />
              <span>
                Client IP: <code className="text-blue-700 font-mono">{log.ip || '127.0.0.1'}</code>
              </span>
            </div>

            <div className="sm:col-span-2 flex items-start gap-2 text-slate-600">
              <Network className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-slate-500">User Agent:</span>
                <p className="text-[11px] text-slate-700 font-mono break-all mt-0.5">
                  {log.userAgent || 'system'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* State Payloads & Diffs */}
        <AuditPayloadViewer
          before={log.before}
          after={log.after}
          title="State Mutation Payloads (Sanitized)"
        />
      </div>
    </Drawer>
  );
}
