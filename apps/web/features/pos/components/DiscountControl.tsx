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
        className="w-full py-1.5 px-3 rounded-xl border border-dashed border-white/20 hover:border-white/40 text-slate-400 hover:text-white text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <Tag className="w-3.5 h-3.5 text-sky-400" />
        <span>Apply Cart Discount / Coupon</span>
      </button>
    );
  }

  return (
    <div className="bg-[#021b47] border border-white/10 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-sky-400" />
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
                  ? 'bg-sky-500 text-white font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
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
