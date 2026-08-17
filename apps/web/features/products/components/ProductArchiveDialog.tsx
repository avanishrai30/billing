'use client';

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, Button } from '../../../components/ui';
import { useArchiveProductMutation } from '../hooks';
import type { ProductDoc } from '../types';

export interface ProductArchiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product?: ProductDoc | null;
}

export function ProductArchiveDialog({
  isOpen,
  onClose,
  product
}: ProductArchiveDialogProps) {
  const archiveMutation = useArchiveProductMutation();
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;

  const handleConfirmArchive = async () => {
    setError(null);
    try {
      await archiveMutation.mutateAsync(product.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to archive product SKU.';
      setError(msg);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Archive Product: ${product.name}`}
      description="Deactivate this SKU from POS and procurement catalogs while preserving historical invoices."
      maxWidth="sm"
    >
      <div className="space-y-4">
        {error && (
          <div
            role="alert"
            className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium"
          >
            {error}
          </div>
        )}

        <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-white">Product Catalog Soft-Delete</p>
            <p className="text-slate-300 leading-relaxed">
              Archiving SKU <strong className="font-mono text-white">{product.sku}</strong> will:
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-300">
              <li>Hide it from POS and purchase entry dropdowns.</li>
              <li>Deactivate barcode mappings for reassignment.</li>
              <li>Retain historical sales and ledger records without data loss.</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={archiveMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirmArchive}
            isLoading={archiveMutation.isPending}
          >
            Archive Product SKU
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
