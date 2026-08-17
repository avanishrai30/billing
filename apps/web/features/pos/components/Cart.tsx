'use client';

import React from 'react';
import { ShoppingCart, Trash2, ArrowRight } from 'lucide-react';
import { CartItem } from './CartItem';
import { CustomerSelector } from './CustomerSelector';
import { DiscountControl } from './DiscountControl';
import { CartTotals } from './CartTotals';
import { Button, IconButton } from '../../../components/ui';
import type { POSCartItem, POSTotals, POSCustomer } from '../types';

export interface CartProps {
  items: POSCartItem[];
  totals: POSTotals;
  customer: POSCustomer | null;
  customers: POSCustomer[];
  discount: number;
  onSelectCustomer: (cust: POSCustomer | null) => void;
  onIncrementQuantity: (productId: string) => void;
  onDecrementQuantity: (productId: string) => void;
  onRemoveItem: (productId: string) => void;
  onUpdateItemDiscount: (productId: string, discountPercent: number) => void;
  onUpdateCartDiscount: (discount: number) => void;
  onClearCart: () => void;
  onOpenCheckout: () => void;
}

export function Cart({
  items,
  totals,
  customer,
  customers,
  discount,
  onSelectCustomer,
  onIncrementQuantity,
  onDecrementQuantity,
  onRemoveItem,
  onUpdateItemDiscount,
  onUpdateCartDiscount,
  onClearCart,
  onOpenCheckout
}: CartProps) {
  const isCartEmpty = items.length === 0;

  return (
    <div
      data-testid="pos-cart-panel"
      className="bg-[#0f172a] border border-white/10 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Current Sale Cart
            </h3>
            <span className="text-[11px] text-slate-400">
              {items.length} {items.length === 1 ? 'line item' : 'line items'}
            </span>
          </div>
        </div>

        {!isCartEmpty && (
          <IconButton
            aria-label="Clear entire cart"
            variant="ghost"
            size="sm"
            onClick={onClearCart}
            icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
          />
        )}
      </div>

      {/* Customer Selector */}
      <div className="p-3 border-b border-white/5">
        <CustomerSelector
          customers={customers}
          selectedCustomer={customer}
          onSelectCustomer={onSelectCustomer}
        />
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isCartEmpty ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-slate-500">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-300">Cart is Empty</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
              Select products from catalog or scan a barcode to add to current ticket.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <CartItem
              key={item.productId}
              item={item}
              onIncrement={() => onIncrementQuantity(item.productId)}
              onDecrement={() => onDecrementQuantity(item.productId)}
              onRemove={() => onRemoveItem(item.productId)}
              onUpdateDiscount={(pct) => onUpdateItemDiscount(item.productId, pct)}
            />
          ))
        )}
      </div>

      {/* Bottom Valuation & Checkout Panel */}
      <div className="p-3.5 border-t border-white/10 bg-[#0f172a]/80 space-y-3">
        {!isCartEmpty && (
          <DiscountControl
            discount={discount}
            onChange={onUpdateCartDiscount}
            subtotal={totals.subtotal}
          />
        )}

        <CartTotals totals={totals} />

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isCartEmpty}
          onClick={onOpenCheckout}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          <span>Pay & Settle (₹ {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
        </Button>
      </div>
    </div>
  );
}
