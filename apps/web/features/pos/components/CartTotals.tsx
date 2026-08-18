'use client';

import React from 'react';
import type { POSTotals } from '../types';

export interface CartTotalsProps {
  totals: POSTotals;
}

export function CartTotals({ totals }: CartTotalsProps) {
  const totalDiscount = (totals.itemDiscountTotal || 0) + (totals.cartDiscount || 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
      <div className="flex items-center justify-between text-slate-600">
        <span>Items Subtotal</span>
        <span className="font-mono tabular-nums">
          ₹ {totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {totalDiscount > 0 && (
        <div className="flex items-center justify-between text-amber-700">
          <span>Total Discount</span>
          <span className="font-mono tabular-nums">
            - ₹ {totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between text-slate-600">
        <span>Estimated GST Tax</span>
        <span className="font-mono tabular-nums">
          + ₹ {totals.taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between">
        <span className="font-semibold text-slate-950 text-xs">
          Payable Amount
        </span>
        <span className="text-xl font-semibold font-mono text-emerald-700 tabular-nums">
          ₹ {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}
