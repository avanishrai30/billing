'use client';

import React, { useState } from 'react';
import { Plus, Minus, Package, Check } from 'lucide-react';
import { normalizePublicAssetUrl } from '../../../lib/utils/media';
import { Button } from '../../../components/ui';
import type { POSProduct } from '../types';

export interface ProductCardProps {
  product: POSProduct;
  onAddToCart: (product: POSProduct) => void;
  onIncrement?: (productId: string) => void;
  onDecrement?: (productId: string) => void;
  cartQuantity?: number;
}

export function ProductCard({
  product,
  onAddToCart,
  onIncrement,
  onDecrement,
  cartQuantity = 0
}: ProductCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const price = Number(product.sellingPrice ?? product.price ?? 0);
  const rawImage = product.imageUrl || product.image || '';
  const resolvedImageUrl = normalizePublicAssetUrl(rawImage);
  const showImage = !!resolvedImageUrl && !imgFailed;

  const stock = typeof product.stock === 'number' ? product.stock : (product.inventory ?? null);
  const isOutOfStock = stock !== null && stock <= 0;

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onIncrement) {
      onIncrement(product.id);
    } else {
      onAddToCart(product);
    }
  };

  const handleMinusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDecrement) {
      onDecrement(product.id);
    }
  };

  return (
    <div
      data-testid={`product-card-${product.id}`}
      className={`group relative bg-white border rounded-xl p-2.5 flex flex-col justify-between transition-[background-color,border-color,box-shadow] duration-150 ease-out overflow-hidden shadow-[0_2px_12px_rgba(15,23,42,0.03)] active:scale-[0.99] ${
        cartQuantity > 0
          ? 'border-blue-400 bg-blue-50/40 ring-1 ring-blue-200'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-[0_8px_20px_rgba(15,23,42,0.05)]'
      }`}
    >
      {/* 1. GST Badge & 2. Media */}
      <div className="w-full h-20 sm:h-22 mb-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden relative shrink-0">
        {showImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={resolvedImageUrl!}
            alt={product.name}
            className="w-full h-full object-contain p-1.5"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <Package className="w-6 h-6 stroke-[1.5]" />
          </div>
        )}

        {/* In-Cart Indicator Badge */}
        {cartQuantity > 0 && (
          <div className="absolute top-1.5 right-1.5 h-4.5 px-1.5 rounded-md bg-blue-700 text-white font-bold text-[9px] inline-flex items-center gap-1 shadow-sm">
            <Check className="w-2.5 h-2.5 shrink-0" />
            <span>{cartQuantity} in cart</span>
          </div>
        )}

        {/* GST / Tax Tag */}
        {Number(product.gst || product.tax || 0) > 0 && (
          <div className="absolute top-1.5 left-1.5 h-4.5 px-1.5 rounded bg-white/95 border border-slate-200 text-slate-700 font-mono text-[9px] font-medium shadow-2xs inline-flex items-center">
            {product.gst || product.tax}% GST
          </div>
        )}
      </div>

      {/* 3. Category + SKU & 4. Product Title */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div className="min-w-0 mb-1.5">
          <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 leading-none mb-1">
            <span className="truncate max-w-[55%]">{product.category || 'General'}</span>
            {product.sku && (
              <span className="font-mono text-[9px] text-slate-400 truncate max-w-[45%] text-right">
                {product.sku}
              </span>
            )}
          </div>
          <h3
            className="font-semibold text-xs text-slate-900 line-clamp-2 leading-snug h-8"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        {/* 5. Divider & Stacked Footer (Price block on top, Action button on bottom) */}
        <div className="mt-auto pt-2 border-t border-slate-100 flex flex-col gap-2">
          {/* Price section: full-width, no clipping, green emphasis */}
          <div className="w-full min-w-0" data-testid={`product-price-${product.id}`}>
            <div className="text-sm sm:text-base font-extrabold font-mono text-emerald-700 tabular-nums leading-tight overflow-visible">
              ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 leading-tight truncate mt-0.5">
              per {product.unit || 'pack'}
            </div>
          </div>

          {/* Action section: full-width 40px action */}
          <div className="w-full min-w-0">
            {cartQuantity > 0 ? (
              <div
                data-testid={`product-stepper-${product.id}`}
                className="w-full h-10 inline-flex items-center justify-between rounded-lg border border-blue-300 bg-white p-1 shadow-2xs"
              >
                <button
                  type="button"
                  onClick={handleMinusClick}
                  aria-label={`Decrease quantity of ${product.name}`}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-rose-600 active:bg-slate-300 transition-colors text-sm font-bold cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono text-sm font-bold text-blue-900 px-2 tabular-nums">
                  {cartQuantity}
                </span>
                <button
                  type="button"
                  onClick={handlePlusClick}
                  aria-label={`Increase quantity of ${product.name}`}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-bold cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={isOutOfStock}
                onClick={() => onAddToCart(product)}
                aria-label={`Add ${product.name} to cart`}
                className="w-full !h-10 !px-3 font-semibold text-xs sm:text-sm whitespace-nowrap overflow-visible flex items-center justify-center gap-2 shadow-2xs hover:border-slate-300 active:scale-[0.98]"
                leftIcon={<Plus className="w-4 h-4 shrink-0 text-slate-600" />}
              >
                Add
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
