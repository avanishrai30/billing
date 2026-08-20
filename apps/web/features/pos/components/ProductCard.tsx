'use client';

import React, { useState } from 'react';
import { Plus, Package, Check } from 'lucide-react';
import { normalizePublicAssetUrl } from '../../../lib/utils/media';
import { Button } from '../../../components/ui';
import type { POSProduct } from '../types';

export interface ProductCardProps {
  product: POSProduct;
  onAddToCart: (product: POSProduct) => void;
  cartQuantity?: number;
}

export function ProductCard({
  product,
  onAddToCart,
  cartQuantity = 0
}: ProductCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const price = Number(product.sellingPrice ?? product.price ?? 0);
  const rawImage = product.imageUrl || product.image || '';
  const resolvedImageUrl = normalizePublicAssetUrl(rawImage);
  const showImage = !!resolvedImageUrl && !imgFailed;

  const stock = typeof product.stock === 'number' ? product.stock : (product.inventory ?? null);
  const isOutOfStock = stock !== null && stock <= 0;

  return (
    <div
      data-testid={`product-card-${product.id}`}
      className={`group relative bg-white border rounded-lg p-3 flex min-h-[252px] flex-col justify-between transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out overflow-hidden shadow-[0_8px_24px_rgba(15,23,42,0.035)] active:scale-[0.99] ${
        cartQuantity > 0
          ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-100'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-[0_14px_34px_rgba(15,23,42,0.06)]'
      }`}
    >
    <div className="w-full h-24 sm:h-28 mb-3 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden relative shrink-0">
        {showImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={resolvedImageUrl!}
            alt={product.name}
            className="w-full h-full object-contain p-2"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <Package className="w-8 h-8" />
          </div>
        )}

        {/* In Cart Indicator Pill */}
        {cartQuantity > 0 && (
          <div className="absolute top-2 right-2 h-5 px-2 rounded-md bg-blue-700 text-white font-bold text-[10px] inline-flex items-center gap-1 shadow-sm">
            <Check className="w-3 h-3 shrink-0" />
            <span>{cartQuantity} in cart</span>
          </div>
        )}

        {/* GST / Tax Tag */}
        {Number(product.gst || product.tax || 0) > 0 && (
          <div className="absolute top-2 left-2 h-5 px-1.5 rounded bg-white/95 border border-slate-200 text-slate-700 font-mono text-[9px] shadow-sm inline-flex items-center">
            {product.gst || product.tax}% GST
          </div>
        )}
      </div>

      {/* Product Content Details */}
      <div className="flex-1 flex flex-col justify-between space-y-2">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
            <span className="truncate">{product.category || 'General'}</span>
            {product.sku && (
              <span className="font-mono text-[10px] text-slate-500 truncate">
                {product.sku}
              </span>
            )}
          </div>
          <h3
            className="font-semibold text-xs text-slate-900 line-clamp-3 mt-0.5 leading-snug min-h-[3rem]"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        {/* Price & Add Action Row */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-[minmax(0,1fr)_66px] items-center gap-2">
          <div className="min-w-0">
            <div className="text-[12px] sm:text-[13px] font-semibold font-mono text-emerald-700 tabular-nums whitespace-nowrap leading-tight">
              ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 leading-tight break-words">
              per {product.unit || 'unit'}
            </div>
          </div>

          <Button
            type="button"
            variant={cartQuantity > 0 ? 'primary' : 'secondary'}
            size="sm"
            disabled={isOutOfStock}
            onClick={() => onAddToCart(product)}
            aria-label={`Add ${product.name} to cart`}
            className="w-[66px] px-0 shrink-0"
            leftIcon={<Plus className="w-3.5 h-3.5 shrink-0" />}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
