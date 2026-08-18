'use client';

import React, { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { Input, IconButton } from '../../../components/ui';

export interface DiscountControlProps {
  discount: number;
  onChange: (discount: number) => void;
  subtotal: number;
}

export function DiscountControl({
  discount,
  onChange,
  subtotal
}: DiscountControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen && discount === 0) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full py-2 px-3 rounded-lg border border-dashed border-slate-300 hover:border-blue-300 text-slate-600 hover:text-blue-700 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-ring"
      >
        <Tag className="w-3.5 h-3.5 text-blue-600" />
        <span>Apply Cart Discount / Coupon</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-blue-600" />
          Cart Level Discount
        </span>
        <IconButton
          aria-label="Remove discount"
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange(0);
            setIsOpen(false);
          }}
          icon={<X className="w-3 h-3 text-slate-400" />}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            type="number"
            min="0"
            max={subtotal}
            step="any"
            isNumeric
            placeholder="Discount in ₹"
            value={discount || ''}
            onChange={(e) => {
              const val = Math.max(0, Math.min(subtotal, parseFloat(e.target.value) || 0));
              onChange(val);
            }}
          />
        </div>
        <div className="flex items-center gap-1">
          {[50, 100, 200, 500].map((amt) => (
            <button
              key={amt}
              type="button"
              disabled={amt > subtotal}
              onClick={() => onChange(amt)}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                discount === amt
                  ? 'bg-blue-700 text-white font-bold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              ₹{amt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
