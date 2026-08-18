'use client';

import React, { useState } from 'react';
import { Plus, Package, Check } from 'lucide-react';
import { normalizePublicAssetUrl } from '../../../lib/utils/media';
import { Badge } from '../../../components/ui';
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
      className={`group relative bg-white border rounded-2xl p-3.5 flex flex-col justify-between transition-colors overflow-hidden shadow-xs ${
        cartQuantity > 0
          ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-200'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top Media Container - Fixed Deterministic Geometry */}
      <div className="w-full h-28 mb-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden relative">
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
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-blue-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm">
            <Check className="w-3 h-3" />
            <span>{cartQuantity} in cart</span>
          </div>
        )}

        {/* GST / Tax Tag */}
        {Number(product.gst || product.tax || 0) > 0 && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-900/70 text-white font-mono text-[9px]">
            {product.gst || product.tax}% GST
          </div>
        )}
      </div>

      {/* Product Content Details */}
      <div className="flex-1 flex flex-col justify-between space-y-2">
        <div>
          <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
            <span className="truncate">{product.category || 'General'}</span>
            {product.sku && (
              <span className="font-mono text-[10px] text-slate-500 truncate">
                {product.sku}
              </span>
            )}
          </div>
          <h3
            className="font-semibold text-xs text-slate-900 line-clamp-2 mt-0.5 leading-snug"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        {/* Price & Add Action Row */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold font-mono text-emerald-700 tabular-nums">
              ₹ {price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500">
              per {product.unit || 'unit'}
            </div>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => onAddToCart(product)}
            aria-label={`Add ${product.name} to cart`}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              cartQuantity > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{cartQuantity > 0 ? 'Add' : 'Add'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
