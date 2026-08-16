'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, Button } from '../../../components/ui';
import type { PurchaseDoc } from '../types';

export interface PurchaseVoidDialogProps {
  purchase: PurchaseDoc | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function PurchaseVoidDialog({
  purchase,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}: PurchaseVoidDialogProps) {
  if (!purchase) return null;

  const poNum = purchase.purchaseId || purchase.id;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Void Procurement Inward Entry"
      description={`Are you sure you want to void purchase #${poNum}?`}
    >
      <div className="space-y-4">
        {/* Warning Banner */}
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-rose-200 leading-relaxed">
            <strong>Stock Ledger Reversal Warning:</strong> Voiding this purchase will
            atomically deduct the received batch quantities from{' '}
            <span className="font-mono text-white">
              {purchase.locationId || purchase.storeId || 'the outlet'}
            </span>{' '}
            inventory. This action is permanently audited and cannot be undone.
          </div>
        </div>

        {/* Purchase Summary */}
        <div className="p-3 rounded-xl bg-[#021b47] border border-white/10 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Supplier:</span>
            <span className="font-semibold text-white">{purchase.supplierName || 'General Supplier'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Total Purchase Value:</span>
            <span className="font-mono font-bold text-rose-400 tabular-nums">
              ₹ {Number(purchase.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            isLoading={isLoading}
            onClick={onConfirm}
          >
            Confirm & Void Inward Stock
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
