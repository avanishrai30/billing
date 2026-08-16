'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, Button } from '../../../components/ui';
import type { UserDoc } from '../types';

export interface UserDeactivateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserDoc | null;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function UserDeactivateDialog({
  isOpen,
  onClose,
  user,
  onConfirm,
  isLoading = false
}: UserDeactivateDialogProps) {
  if (!user) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Suspend User Account"
      description={`Are you sure you want to suspend access for ${user.name} (@${user.username})?`}
      maxWidth="sm"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
            Confirm Suspension
          </Button>
        </div>
      }
    >
      <div className="space-y-3 py-1">
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            Suspending <strong className="text-white">{user.name}</strong> will immediately revoke all
            active browser sessions, disconnect active WebSocket streams, and block future logins until
            reactivated.
          </div>
        </div>
      </div>
    </Dialog>
  );
}
