'use client';

import React from 'react';
import { Building, Users, Landmark, Network } from 'lucide-react';
import type { TaxSummaryMetrics } from '../types';

export interface GSTBreakdownProps {
  metrics: TaxSummaryMetrics;
}

export function GSTBreakdown({ metrics }: GSTBreakdownProps) {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.04)] space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950 tracking-tight">
            GST Compliance & Segmentation Matrix
          </h3>
          <p className="text-xs text-slate-500">
            Real-time Tax Liability Reconciliation & B2B/B2C Segmentation Matrix
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* B2B Registered Sales */}
        <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">B2B Registered Sales</span>
            <Building className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="text-base font-semibold text-slate-950 font-mono tabular-nums">
            ₹{metrics.b2bSalesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-semibold text-blue-700">
            {metrics.b2bInvoicesCount} Invoices (GSTIN Verified)
          </div>
        </div>

        {/* B2C Consumer Bills */}
        <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">B2C Retail Sales</span>
            <Users className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="text-base font-semibold text-slate-950 font-mono tabular-nums">
            ₹{metrics.b2cSalesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            {metrics.b2cInvoicesCount} Consumer Bills
          </div>
        </div>

        {/* CGST Share (50%) */}
        <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Central GST (CGST)</span>
            <Landmark className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="text-base font-semibold text-amber-700 font-mono tabular-nums">
            ₹{metrics.cgstShare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            50% Central Revenue Share
          </div>
        </div>

        {/* SGST Share (50%) */}
        <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">State GST (SGST)</span>
            <Landmark className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="text-base font-semibold text-emerald-700 font-mono tabular-nums">
            ₹{metrics.sgstShare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            50% State Revenue Share
          </div>
        </div>
      </div>
    </div>
  );
}
