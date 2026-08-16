'use client';

import React from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { Card, SectionHeader, FormField, Input, Button } from '../../../components/ui';
import type { PurchaseTotals } from '../types';

export interface PurchaseTotalsProps {
  totals: PurchaseTotals;
  otherCharges: number;
  onOtherChargesChange: (val: number) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  isValid?: boolean;
}

export function PurchaseTotalsSummary({
  totals,
  otherCharges,
  onOtherChargesChange,
  onSubmit,
  isLoading = false,
  isValid = true
}: PurchaseTotalsProps) {
  return (
    <Card variant="elevated" className="sticky top-20">
      <SectionHeader
        title="Valuation & Inward Settlement"
        subtitle="Authoritative taxable totals and procurement invoice summary"
      />

      <div className="space-y-3 pt-3 border-t border-white/5">
        {/* Goods Raw Subtotal */}
        <div className="flex justify-between text-xs text-slate-400">
          <span>Items Raw Subtotal</span>
          <span className="font-mono tabular-nums text-slate-200">
            ₹ {totals.goodsSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Item Discount Total */}
        {totals.itemDiscountTotal > 0 && (
          <div className="flex justify-between text-xs text-emerald-400">
            <span>Item Discounts</span>
            <span className="font-mono tabular-nums">
              - ₹ {totals.itemDiscountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Goods Taxable */}
        <div className="flex justify-between text-xs text-slate-400">
          <span>Goods Taxable Base</span>
          <span className="font-mono tabular-nums text-slate-200">
            ₹ {totals.goodsTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Goods GST */}
        <div className="flex justify-between text-xs text-slate-400">
          <span>Goods GST Amount</span>
          <span className="font-mono tabular-nums text-slate-200">
            + ₹ {totals.goodsGstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Freight & Freight GST */}
        {totals.freightCharge > 0 && (
          <div className="flex justify-between text-xs text-sky-400">
            <span>Freight ({totals.freightCharge} + {totals.freightGst} GST)</span>
            <span className="font-mono tabular-nums">
              + ₹ {(totals.freightCharge + totals.freightGst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Other Inward Charges */}
        <div className="pt-2">
          <FormField label="Other Charges / Handling (₹)">
            <Input
              type="number"
              min="0"
              step="0.01"
              isNumeric
              value={otherCharges}
              onChange={(e) => onOtherChargesChange(parseFloat(e.target.value) || 0)}
            />
          </FormField>
        </div>

        {/* Grand Total */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Inward Grand Total
            </span>
            <span className="text-[11px] text-slate-400">Includes applicable GST</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
            ₹ {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-4">
          <Button
            variant="primary"
            size="lg"
            className="w-full justify-center"
            isLoading={isLoading}
            disabled={!isValid || isLoading}
            onClick={onSubmit}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Record Inward Purchase Batch
          </Button>
        </div>
      </div>
    </Card>
  );
}
