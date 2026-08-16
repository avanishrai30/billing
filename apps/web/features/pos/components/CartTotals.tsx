'use client';

import React from 'react';
import type { POSTotals } from '../types';

export interface CartTotalsProps {
  totals: POSTotals;
}

export function CartTotals({ totals }: CartTotalsProps) {
  const totalDiscount = (totals.itemDiscountTotal || 0) + (totals.cartDiscount || 0);

  return (
    <div className="bg-[#021b47] border border-white/10 rounded-xl p-3.5 space-y-2 text-xs">
      {/* Subtotal */}
      <div className="flex items-center justify-between text-slate-300">
        <span>Items Subtotal</span>
        <span className="font-mono tabular-nums">
          ₹ {totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Discounts */}
      {totalDiscount > 0 && (
        <div className="flex items-center justify-between text-amber-400">
          <span>Total Discount</span>
          <span className="font-mono tabular-nums">
            - ₹ {totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* GST Tax Total */}
      <div className="flex items-center justify-between text-slate-300">
        <span>Estimated GST Tax</span>
        <span className="font-mono tabular-nums">
          + ₹ {totals.taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Prominent Grand Total */}
      <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
        <span className="font-bold text-white uppercase tracking-wider text-xs">
          Payable Amount
        </span>
        <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
          ₹ {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}
