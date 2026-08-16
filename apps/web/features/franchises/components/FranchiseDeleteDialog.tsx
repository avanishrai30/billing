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
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            This action will remove <strong className="text-white">{franchise.name}</strong> from the
            active directory. Historical supply orders and audit records remain preserved.
          </div>
        </div>
      </div>
    </Dialog>
  );
}
