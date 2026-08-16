'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, AlertCircle } from 'lucide-react';
import { Dialog, Button } from '../../../components/ui';
import { useDeleteCustomerMutation } from '../hooks';
import type { CustomerDoc } from '../types';

export interface CustomerDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerDoc | null;
}

export function CustomerDeleteDialog({
  isOpen,
  onClose,
  customer
}: CustomerDeleteDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const deleteMutation = useDeleteCustomerMutation();

  if (!customer) return null;

  const handleDelete = async () => {
    setServerError(null);
    try {
      await deleteMutation.mutateAsync(customer.id);
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to delete customer profile.');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Delete Customer: ${customer.name}`}
      description="Remove this customer profile from the active CRM directory."
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
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-sm text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Directory Removal Notice</span>
          </div>
          <p className="text-amber-200/90 leading-relaxed">
            Deleting <strong className="text-white">{customer.name}</strong> ({customer.phone}) will remove their profile from future POS customer lookups. All past historical sales invoices will remain safely preserved in the immutable ledger.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
