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
      className="bg-white border border-slate-200 rounded-xl flex flex-col h-full overflow-hidden shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
    >
      {/* Pinned Header */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-950 leading-tight">
              Current Sale Cart
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
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
            icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
          />
        )}
      </div>

      {/* Pinned Customer Selector */}
      <div className="p-3 border-b border-slate-100 shrink-0 bg-white">
        <CustomerSelector
          customers={customers}
          selectedCustomer={customer}
          onSelectCustomer={onSelectCustomer}
        />
      </div>

      {/* Independently Scrollable Cart Items List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {isCartEmpty ? (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3 text-slate-400">
              <ShoppingCart className="w-6 h-6 stroke-[1.5]" />
            </div>
            <p className="text-xs font-bold text-slate-800">Cart is Empty</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
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

      {/* Pinned Bottom Valuation & Checkout Panel */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50/90 shrink-0 space-y-3">
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
          className="w-full justify-center shadow-[0_10px_22px_rgba(37,99,235,0.18)]"
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
