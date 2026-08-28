'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ShoppingCart, ReceiptText } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';

export interface InvoiceHeaderProps {
  selectedLocation: string;
  storeOptions: Array<{ value: string; label: string }>;
  onSelectLocation: (loc: string) => void;
  canCreatePOS?: boolean;
  onCustomizeReceipt?: () => void;
}

export function InvoiceHeader({
  selectedLocation,
  storeOptions,
  onSelectLocation,
  canCreatePOS = true,
  onCustomizeReceipt
}: InvoiceHeaderProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
      {/* Title & Description */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Invoices & Sales Ledger
            </h1>
            <Badge variant="success" size="sm" dot>
              REALTIME
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete tax invoice register, payment reconciliation, and atomic void audit trail
          </p>
        </div>
      </div>

      {/* Outlet Selector & POS Navigation */}
      <div className="flex flex-wrap items-center gap-2.5">
        {storeOptions.length > 1 && (
          <select
            value={selectedLocation}
            onChange={(e) => onSelectLocation(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
            aria-label="Filter invoices by store outlet"
          >
            {storeOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {onCustomizeReceipt && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onCustomizeReceipt}
            leftIcon={<ReceiptText className="w-3.5 h-3.5" />}
          >
            Customize Receipt
          </Button>
        )}

        {canCreatePOS && (
          <Link href="/pos">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}
            >
              New POS Sale
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
