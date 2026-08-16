'use client';

import React from 'react';
import { Building, Users, Landmark, Network } from 'lucide-react';
import type { TaxSummaryMetrics } from '../types';

export interface GSTBreakdownProps {
  metrics: TaxSummaryMetrics;
}

export function GSTBreakdown({ metrics }: GSTBreakdownProps) {
  return (
    <div className="bg-[#001845] p-5 rounded-2xl border border-white/10 space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">
            GST Compliance & Segmentation Matrix
          </h3>
          <p className="text-xs text-slate-400">
            Real-time Tax Liability Reconciliation & B2B/B2C Segmentation Matrix
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* B2B Registered Sales */}
        <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">B2B Registered Sales</span>
            <Building className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <div className="text-base font-bold text-white font-mono">
            ₹{metrics.b2bSalesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-semibold text-sky-400">
            {metrics.b2bInvoicesCount} Invoices (GSTIN Verified)
          </div>
        </div>

        {/* B2C Consumer Bills */}
        <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">B2C Retail Sales</span>
            <Users className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-white font-mono">
            ₹{metrics.b2cSalesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-semibold text-slate-400">
            {metrics.b2cInvoicesCount} Consumer Bills
          </div>
        </div>

        {/* CGST Share (50%) */}
        <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Central GST (CGST)</span>
            <Landmark className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-base font-bold text-amber-300 font-mono">
            ₹{metrics.cgstShare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-semibold text-slate-400">
            50% Central Revenue Share
          </div>
        </div>

        {/* SGST Share (50%) */}
        <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">State GST (SGST)</span>
            <Landmark className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-emerald-300 font-mono">
            ₹{metrics.sgstShare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-semibold text-slate-400">
            50% State Revenue Share
          </div>
        </div>
      </div>
    </div>
  );
}
