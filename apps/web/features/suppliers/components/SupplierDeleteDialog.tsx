'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, AlertCircle } from 'lucide-react';
import { Dialog, Button } from '../../../components/ui';
import { useDeleteSupplierMutation } from '../hooks';
import type { SupplierDoc } from '../types';

export interface SupplierDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierDoc | null;
}

export function SupplierDeleteDialog({
  isOpen,
  onClose,
  supplier
}: SupplierDeleteDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const deleteMutation = useDeleteSupplierMutation();

  if (!supplier) return null;

  const handleDelete = async () => {
    setServerError(null);
    try {
      await deleteMutation.mutateAsync(supplier.id);
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to delete supplier profile.');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Delete Supplier: ${supplier.name}`}
      description="Remove this supplier profile from the active vendor directory."
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            isLoading={deleteMutation.isPending}
            onClick={handleDelete}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Confirm & Delete Profile
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-xs">
        {serverError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Vendor Removal Notice</span>
          </div>
          <p className="text-amber-800 leading-relaxed">
            Deleting <strong className="text-amber-950">{supplier.name}</strong> ({supplier.contact}) will remove their profile from future purchase invoice entries and product inward selections. All past procurement history will remain safely preserved in the purchase ledger.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
