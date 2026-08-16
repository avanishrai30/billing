'use client';

import React, { useState, useEffect } from 'react';
import {
  Banknote,
  QrCode,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Dialog, Button, FormField, Input } from '../../../components/ui';
import type { PaymentMode, POSTotals, POSCustomer } from '../types';

export interface PaymentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  totals: POSTotals;
  customer: POSCustomer | null;
  itemCount: number;
  onConfirmPayment: (details: {
    paymentMode: PaymentMode;
    amountPaid: number;
    notes?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export function PaymentPanel({
  isOpen,
  onClose,
  totals,
  customer,
  itemCount,
  onConfirmPayment,
  isLoading
}: PaymentPanelProps) {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Set default tendered amount to grand total when opened
  useEffect(() => {
    if (isOpen) {
      setAmountTendered(totals.grandTotal.toString());
      setError(null);
    }
  }, [isOpen, totals.grandTotal]);

  const tenderedNum = parseFloat(amountTendered) || 0;
  const changeDue = Math.max(0, Math.round((tenderedNum - totals.grandTotal) * 100) / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (paymentMode === 'CASH' && tenderedNum < totals.grandTotal) {
      setError(`Amount tendered (₹${tenderedNum}) is less than payable grand total (₹${totals.grandTotal}).`);
      return;
    }

    try {
      await onConfirmPayment({
        paymentMode,
        amountPaid: tenderedNum || totals.grandTotal,
        notes: notes.trim() || undefined
      });
    } catch (err: any) {
      setError(err?.message || 'Payment submission failed.');
    }
  };

  const paymentModes: Array<{
    id: PaymentMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'CASH', label: 'Cash Tender', icon: Banknote },
    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
    { id: 'CARD', label: 'Card Swipe', icon: CreditCard },
    { id: 'BANK', label: 'Bank Transfer', icon: Building }
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="POS Settlement & Checkout"
      description={`Finalize payment for ${itemCount} items • ${customer ? customer.name : 'Walk-in Customer'}`}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isLoading}
            onClick={handleSubmit}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            Complete Sale (₹ {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Grand Total Callout */}
        <div className="p-4 rounded-xl bg-[#021b47] border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Total Due</span>
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              ₹ {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {customer && (
            <div className="text-right text-xs">
              <span className="text-slate-400 block">Customer</span>
              <span className="font-semibold text-white">{customer.name}</span>
              <span className="text-slate-400 block font-mono text-[11px]">{customer.phone}</span>
            </div>
          )}
        </div>

        {/* Payment Mode Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
            Select Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            {paymentModes.map((mode) => {
              const Icon = mode.icon;
              const isSelected = paymentMode === mode.id;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPaymentMode(mode.id)}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-md shadow-sky-500/10'
                      : 'bg-[#021b47] border-white/10 hover:border-white/20 text-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cash Tender & Change calculation (for CASH mode) */}
        {paymentMode === 'CASH' && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <FormField label="Amount Tendered (₹)" required>
              <Input
                type="number"
                min="0"
                step="any"
                isNumeric
                placeholder="0.00"
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                autoFocus
              />
            </FormField>

            <FormField label="Change Return (₹)">
              <div className="h-10 px-3.5 bg-[#021b47] border border-white/15 rounded-xl flex items-center font-mono font-bold text-amber-400 text-sm tabular-nums">
                ₹ {changeDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </FormField>
          </div>
        )}

        {/* Optional Notes */}
        <FormField label="Bill Remarks / Payment Ref (Optional)">
          <Input
            placeholder="e.g. UPI Ref #, Cheque #, split settlement..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormField>
      </form>
    </Dialog>
  );
}
