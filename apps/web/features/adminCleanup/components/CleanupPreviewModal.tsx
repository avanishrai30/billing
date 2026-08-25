'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Trash2,
  Archive,
  ShieldAlert,
  Boxes,
  IndianRupee
} from 'lucide-react';
import { Dialog, Button, Badge, Input } from '../../../components/ui';
import type { CleanupPreviewResult } from '../types';

export interface CleanupPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  preview: CleanupPreviewResult | null;
  isLoading: boolean;
  onConfirmExecute: (confirmCode: string, password: string) => void;
  isExecuting: boolean;
}

export function CleanupPreviewModal({
  isOpen,
  onClose,
  preview,
  isLoading,
  onConfirmExecute,
  isExecuting
}: CleanupPreviewModalProps) {
  const [typedConfirm, setTypedConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [isFinalStep, setIsFinalStep] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTypedConfirm('');
      setPassword('');
      setIsFinalStep(false);
    }
  }, [isOpen, preview?.previewToken]);

  if (!isOpen || !preview) return null;

  const orphanImpact = preview.orphanInventoryImpact;
  const domainRecordLabel = {
    invoices: 'INVOICE RECORD',
    purchases: 'PURCHASE RECORD',
    products: 'PRODUCT RECORD',
    inventory: 'INVENTORY RECORD'
  }[preview.domain];
  const expectedConfirmCode = `DELETE ${preview.eligibleCount} ${domainRecordLabel}${preview.eligibleCount === 1 ? '' : 'S'}`;
  const isConfirmValid = typedConfirm === expectedConfirmCode;
  const canExecute = preview.eligibleCount > 0 && isConfirmValid && password.length > 0 && !isExecuting;
  const locationSummary = orphanImpact?.locations || [];

  const actionLabel = preview.action.replace(/_/g, ' ').toUpperCase();

  const getActionColor = () => {
    if (preview.action === 'purge') return 'danger';
    if (preview.action === 'void' || preview.action === 'reset_test_stock') return 'brand';
    return 'neutral';
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isFinalStep ? 'Final Cleanup Confirmation' : 'Maintenance Cleanup Preview'}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Safety Warning Header */}
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            isFinalStep
              ? 'bg-red-50/80 border-red-200 text-red-950'
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}
        >
          <AlertTriangle
            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              isFinalStep ? 'text-red-600' : 'text-amber-600'
            }`}
          />
          <div>
            <div className="font-bold text-sm">
              {isFinalStep ? 'Irreversible Execution Gate' : 'Dry-Run Impact Analysis'}
            </div>
            <p className="mt-0.5 text-xs opacity-90">
              {isFinalStep
                ? 'Eligible records will be permanently modified. Protected records will not be touched.'
                : 'Review selected records, cleanup eligibility, and protection reasons before continuing.'}
            </p>
          </div>
        </div>

        {preview.eligibleCount === 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="font-bold text-slate-900">Nothing Eligible to Clean</div>
            <p className="mt-1 text-slate-600">
              The selected records are protected by dependency or stale-state safeguards. Review the protected reasons below and generate a fresh preview after resolving them.
            </p>
          </div>
        )}

        {isFinalStep ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[11px] text-slate-500 font-medium block">Domain</span>
                <span className="text-sm font-bold text-slate-900 capitalize">{preview.domain}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[11px] text-slate-500 font-medium block">Action</span>
                <span className="text-sm font-bold text-slate-900">{actionLabel}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <span className="text-[11px] text-emerald-700 font-medium block">Eligible for Cleanup</span>
                <span className="text-lg font-bold font-mono text-emerald-800">{preview.eligibleCount}</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <span className="text-[11px] text-red-700 font-medium block">Blocked / Protected</span>
                <span className="text-lg font-bold font-mono text-red-800">{preview.blockedCount}</span>
              </div>
            </div>

            <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 text-red-950">
              <div className="font-bold">
                {preview.eligibleCount} {domainRecordLabel.toLowerCase()}{preview.eligibleCount === 1 ? '' : 's'}
                {orphanImpact?.totalQuantity ? ` / ${orphanImpact.totalQuantity} units` : ''}
              </div>
              <p className="mt-1">
                will be permanently deleted. Blocked records will not be modified.
              </p>
            </div>

            {locationSummary.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-700">Affected Locations</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {locationSummary.map((loc) => (
                    <div key={loc.locationId} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1.5">
                      <span className="font-semibold text-slate-800">{loc.locationId}</span>
                      <span className="font-mono font-bold text-slate-900">{loc.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 space-y-3">
              <label className="font-bold text-slate-900 block text-xs">
                Type <span className="font-mono bg-red-100 text-red-900 px-1.5 py-0.5 rounded select-all">{expectedConfirmCode}</span> to confirm:
              </label>
              <Input
                value={typedConfirm}
                onChange={(e) => setTypedConfirm(e.target.value)}
                placeholder={expectedConfirmCode}
                className="font-mono text-xs"
                autoFocus
              />
              <label className="font-bold text-slate-900 block text-xs" htmlFor="cleanup-super-admin-password">
                Super Admin Password
              </label>
              <Input
                id="cleanup-super-admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
          </div>
        ) : (
          <>
        {/* Impact Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[11px] text-slate-500 font-medium block">Selected</span>
            <span className="text-lg font-bold font-mono text-slate-900">{preview.totalSelected}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <span className="text-[11px] text-emerald-700 font-medium block">Eligible for Cleanup</span>
            <span className="text-lg font-bold font-mono text-emerald-800">{preview.eligibleCount}</span>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <span className="text-[11px] text-red-700 font-medium block">Blocked / Protected</span>
            <span className="text-lg font-bold font-mono text-red-800">{preview.blockedCount}</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <span className="text-[11px] text-blue-700 font-medium block">Reversibility</span>
            <span className="text-sm font-bold text-blue-900 block mt-1">
              {preview.reversible ? 'Rollbackable' : 'Permanent'}
            </span>
          </div>
        </div>

        {/* Stock & Financial Impact */}
        {(preview.stockReversalUnits !== 0 || preview.financialImpact !== 0) && (
          <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
            <div className="font-semibold text-slate-800">Simulated Ledger Adjustments:</div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              {preview.stockReversalUnits !== 0 && (
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Boxes className="w-4 h-4 text-blue-600" />
                  <span>Stock Delta:</span>
                  <strong
                    className={
                      preview.stockReversalUnits > 0
                        ? 'text-emerald-700 font-bold'
                        : 'text-amber-700 font-bold'
                    }
                  >
                    {preview.stockReversalUnits > 0 ? `+${preview.stockReversalUnits}` : preview.stockReversalUnits} units
                  </strong>
                </div>
              )}
              {preview.financialImpact !== 0 && (
                <div className="flex items-center gap-1.5 text-slate-700">
                  <IndianRupee className="w-4 h-4 text-slate-600" />
                  <span>Financial Volume:</span>
                  <strong className="text-slate-900 font-bold">
                    ₹{preview.financialImpact.toLocaleString('en-IN')}
                  </strong>
                </div>
              )}
            </div>
          </div>
        )}

        {orphanImpact && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              <span>Orphan Inventory Cleanup Impact</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/70 border border-amber-200 rounded-lg p-3">
                <span className="text-[11px] text-amber-800 font-medium block">Orphan Records</span>
                <span className="text-lg font-bold font-mono text-amber-950">{orphanImpact.recordCount}</span>
              </div>
              <div className="bg-white/70 border border-amber-200 rounded-lg p-3">
                <span className="text-[11px] text-amber-800 font-medium block">Total Units</span>
                <span className="text-lg font-bold font-mono text-amber-950">{orphanImpact.totalQuantity}</span>
              </div>
            </div>
            {orphanImpact.locations.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-amber-900">Affected Locations</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {orphanImpact.locations.map((loc) => (
                    <div key={loc.locationId} className="flex items-center justify-between rounded-md bg-white/70 border border-amber-200 px-2 py-1 text-[11px]">
                      <span className="font-semibold text-amber-950">{loc.locationId}</span>
                      <span className="font-mono font-bold text-amber-900">{loc.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {orphanImpact.ledgerReferences.length > 0 && (
              <div className="text-[11px] text-amber-800">
                Inventory ledger references present: <strong>{orphanImpact.ledgerReferences.length}</strong>
              </div>
            )}
            {orphanImpact.batchReferences.length > 0 && (
              <div className="text-[11px] text-red-700">
                Active batch references blocked: <strong>{orphanImpact.batchReferences.length}</strong>
              </div>
            )}
          </div>
        )}

        {/* Blocked Records List with reasons if any */}
        {preview.blockedRecords.length > 0 && (
          <div className="bg-red-50/50 border border-red-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-red-900 text-xs">
              <XCircle className="w-4 h-4 text-red-600" />
              <span>Blocked Records ({preview.blockedRecords.length}) — Safeguards Applied:</span>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-red-100 text-[11px]">
              {preview.blockedRecords.map((b) => (
                <div key={b.id} className="pt-1 first:pt-0 flex flex-col">
                  <span className="font-semibold text-red-950">{b.label}</span>
                  <span className="text-red-700">{b.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isExecuting}>
            Cancel
          </Button>
          {isFinalStep ? (
            <Button
              variant={getActionColor() as any}
              size="sm"
              onClick={() => onConfirmExecute(typedConfirm, password)}
              disabled={!canExecute}
              isLoading={isExecuting}
            >
              Confirm Cleanup
            </Button>
          ) : preview.eligibleCount > 0 ? (
            <Button
              variant={getActionColor() as any}
              size="sm"
              onClick={() => setIsFinalStep(true)}
              disabled={isExecuting}
            >
              Continue to Final Confirmation
            </Button>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
