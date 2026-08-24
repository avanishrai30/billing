'use client';

import React from 'react';
import { History, RotateCcw, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Drawer, Button, Badge } from '../../../components/ui';
import type { CleanupOperationDoc } from '../types';

export interface CleanupOperationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  operations: CleanupOperationDoc[];
  isLoading: boolean;
  onRollback: (operationId: string) => void;
  isRollingBack: boolean;
}

export function CleanupOperationsDrawer({
  isOpen,
  onClose,
  operations,
  isLoading,
  onRollback,
  isRollingBack
}: CleanupOperationsDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Maintenance Operations Audit Trail">
      <div className="space-y-4 text-xs">
        <p className="text-slate-500 text-xs">
          Chronological ledger of administrative cleanup runs with full pre/post recovery manifests and rollback controls.
        </p>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading audit history...</div>
        ) : operations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No cleanup operations recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {operations.map((op) => {
              const isCompleted = op.status === 'COMPLETED';
              const canRollback = op.reversible && !op.rolledBack && isCompleted;

              return (
                <div
                  key={op.operationId}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-xs">{op.operationId}</span>
                    <Badge
                      variant={
                        op.status === 'COMPLETED'
                          ? 'success'
                          : op.status === 'FAILED'
                          ? 'danger'
                          : 'brand'
                      }
                      size="sm"
                    >
                      {op.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block">Domain / Action:</span>
                      <strong className="text-slate-900 uppercase">
                        {op.domain} • {op.action}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Executed By:</span>
                      <span className="text-slate-800 font-medium">{op.actorUsername}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Processed Count:</span>
                      <span className="font-mono font-bold text-slate-900">{op.successCount} records</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Timestamp:</span>
                      <span>{new Date(op.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {op.rolledBack && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-900 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>
                        Rolled back on {op.rolledBackAt ? new Date(op.rolledBackAt).toLocaleTimeString('en-IN') : ''} by {op.rolledBackBy || 'Super Admin'}
                      </span>
                    </div>
                  )}

                  {canRollback && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Operation is reversible</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onRollback(op.operationId)}
                        disabled={isRollingBack}
                        className="text-xs flex items-center gap-1 text-slate-800"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Rollback Operation
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Drawer>
  );
}
