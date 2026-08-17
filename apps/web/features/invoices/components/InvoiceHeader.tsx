'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ShoppingCart, Download } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';

export interface InvoiceHeaderProps {
  selectedLocation: string;
  storeOptions: Array<{ value: string; label: string }>;
  onSelectLocation: (loc: string) => void;
  canCreatePOS?: boolean;
}

export function InvoiceHeader({
  selectedLocation,
  storeOptions,
  onSelectLocation,
  canCreatePOS = true
}: InvoiceHeaderProps) {
  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
      {/* Title & Description */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 flex-shrink-0">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Invoices & Sales Ledger
            </h1>
            <Badge variant="success" size="sm" dot>
              REALTIME
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
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
            className="px-3 py-2 bg-[#0f172a] border border-white/15 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-sky-400 cursor-pointer"
            aria-label="Filter invoices by store outlet"
          >
            {storeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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
