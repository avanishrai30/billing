'use client';

import React from 'react';
import { Plus, Minus, Trash2, Tag } from 'lucide-react';
import { IconButton } from '../../../components/ui';
import type { POSCartItem } from '../types';

export interface CartItemProps {
  item: POSCartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onUpdateDiscount: (discountPercent: number) => void;
}

export function CartItem({
  item,
  onIncrement,
  onDecrement,
  onRemove,
  onUpdateDiscount
}: CartItemProps) {
  const [showDiscount, setShowDiscount] = React.useState(false);

  return (
    <div
      data-testid={`cart-item-${item.productId}`}
      className="p-3 rounded-xl bg-[#021b47] border border-white/5 space-y-2 text-xs"
    >
      {/* Top row: Name, unit price, remove button */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate" title={item.name}>
            {item.name}
          </h4>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
            <span>
              ₹ {item.price.toFixed(2)} / {item.unit}
            </span>
            {item.gst > 0 && (
              <span className="px-1 py-0.2 rounded bg-white/5 text-slate-300 text-[10px]">
                {item.gst}% GST
              </span>
            )}
          </div>
        </div>

        <IconButton
          aria-label={`Remove ${item.name} from cart`}
          variant="ghost"
          size="sm"
          onClick={onRemove}
          icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
        />
      </div>

      {/* Bottom row: Qty Controls, Discount trigger, and Line Total */}
      <div className="flex items-center justify-between pt-1">
        {/* Quantity Controls */}
        <div className="flex items-center gap-1 bg-[#032154] border border-white/10 rounded-lg p-0.5">
          <IconButton
            aria-label="Decrease quantity"
            variant="ghost"
            size="sm"
            onClick={onDecrement}
            icon={<Minus className="w-3 h-3 text-slate-300" />}
          />
          <span className="w-8 text-center font-mono font-bold text-white tabular-nums">
            {item.quantity}
          </span>
          <IconButton
            aria-label="Increase quantity"
            variant="ghost"
            size="sm"
            onClick={onIncrement}
            icon={<Plus className="w-3 h-3 text-slate-300" />}
          />
        </div>

        {/* Item discount toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDiscount(!showDiscount)}
            aria-label="Toggle item discount"
            className={`p-1 rounded-md text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
              item.discountPercent > 0
                ? 'bg-amber-500/20 text-amber-300 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-3 h-3" />
            <span>{item.discountPercent > 0 ? `${item.discountPercent}% off` : 'Disc'}</span>
          </button>

          {/* Line Total */}
          <div className="font-mono font-bold text-white text-sm tabular-nums text-right">
            ₹ {item.lineTotal.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Expandable Discount Input */}
      {showDiscount && (
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <span className="text-[11px] text-slate-400">Discount %:</span>
          <div className="flex items-center gap-1">
            {[0, 5, 10, 15, 20].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => onUpdateDiscount(pct)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                  item.discountPercent === pct
                    ? 'bg-sky-500 text-white font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
