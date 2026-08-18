'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, Button } from '../../../components/ui';
import type { FranchiseDoc } from '../types';

export interface FranchiseDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  franchise: FranchiseDoc | null;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function FranchiseDeleteDialog({
  isOpen,
  onClose,
  franchise,
  onConfirm,
  isLoading = false
}: FranchiseDeleteDialogProps) {
  if (!franchise) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Franchise Partner"
      description={`Are you sure you want to delete the franchise partner profile for ${franchise.name}?`}
      maxWidth="sm"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
            Confirm Deletion
          </Button>
        </div>
      }
    >
      <div className="space-y-3 py-1">
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div>
            This action will remove <strong className="text-rose-950">{franchise.name}</strong> from the
            active directory. Historical supply orders and audit records remain preserved.
          </div>
        </div>
      </div>
    </Dialog>
  );
}
