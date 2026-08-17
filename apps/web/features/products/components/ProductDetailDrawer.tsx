'use client';

import React from 'react';
import {
  Package,
  Barcode,
  Tag,
  DollarSign,
  Truck,
  Percent,
  Calendar,
  Layers,
  Edit,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { Drawer, Badge, Button, StatusBadge } from '../../../components/ui';
import { normalizePublicAssetUrl } from '../../../lib/utils/media';
import { calculateProductMargin } from '../calculations';
import type { ProductDoc } from '../types';

export interface ProductDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product?: ProductDoc | null;
  onEdit?: (product: ProductDoc) => void;
  onArchive?: (product: ProductDoc) => void;
  canEdit?: boolean;
  canArchive?: boolean;
}

export function ProductDetailDrawer({
  isOpen,
  onClose,
  product,
  onEdit,
  onArchive,
  canEdit = false,
  canArchive = false
}: ProductDetailDrawerProps) {
  if (!product) return null;

  const margin = calculateProductMargin(
    product.sellingPrice || product.price || 0,
    product.purchasePrice || product.cost || 0
  );

  const normalizedImageUrl = product.image ? normalizePublicAssetUrl(product.image) : '';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      description={`SKU: ${product.sku} • Category: ${product.category || 'General'}`}
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* 1. Header Hero Card with Image & Core Metrics */}
        <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="w-24 h-24 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            {normalizedImageUrl ? (
              <img
                src={normalizedImageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <ImageIcon className="w-8 h-8 text-slate-500" />
            )}
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={product.type === 'EXTERNAL' ? 'info' : 'brand'} size="sm">
                {(product.type || 'OWN').toUpperCase()}
              </Badge>
              <Badge variant="neutral" size="sm">
                {product.sellingMode || 'packaged'}
              </Badge>
              <StatusBadge status={product.isArchived ? 'archived' : product.status || 'active'} />
            </div>

            <p className="text-sm font-semibold text-white truncate">{product.brand || 'VC Organic'}</p>
            <p className="text-xs text-slate-400">
              {product.supplier ? `Vendor: ${product.supplier}` : 'Direct Farm Procurement'}
            </p>

            <div className="text-xs text-slate-300 flex items-center gap-2">
              <span>Unit: <strong className="text-white font-mono">{product.unit || 'pc'}</strong></span>
              {product.weight ? (
                <span>• {product.weight} {product.weightUnit || 'g'}</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* 2. Commercial Pricing & Tax Breakdown */}
        <div className="p-4 rounded-xl bg-[#131d33] border border-white/10 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Commercial Pricing & Margin
          </h4>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Purchase Cost
              </span>
              <span className="text-sm font-bold font-mono text-slate-200">
                ₹{(product.purchasePrice || product.cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Selling Price
              </span>
              <span className="text-sm font-bold font-mono text-white">
                ₹{(product.sellingPrice || product.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider block">
                Gross Margin
              </span>
              <span className="text-sm font-bold font-mono text-emerald-300">
                {margin}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
            <span>GST Tax Slab: <strong className="text-white font-mono">{product.gst || 0}%</strong></span>
            <span>Reorder Threshold: <strong className="text-white font-mono">{product.reorderLevel || 5} {product.unit || 'units'}</strong></span>
          </div>
        </div>

        {/* 3. Barcodes & Scanner Identifiers */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Barcode className="w-4 h-4 text-sky-400" />
            Registered Barcode Mappings
          </h4>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 bg-[#131d33] border border-white/10 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-400/20">
                  PRIMARY
                </span>
                <span className="font-mono text-white">
                  {product.barcode || 'No primary barcode assigned'}
                </span>
              </div>
              <span className="text-slate-400 text-[11px]">Primary Retail Unit</span>
            </div>

            {product.barcodes && product.barcodes.length > 0 ? (
              product.barcodes.map((b, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-[#131d33] border border-white/10 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-400/20">
                      {b.type || 'ALTERNATE'}
                    </span>
                    <span className="font-mono text-slate-200">{b.barcode}</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">{b.variantName || 'Unit'}</span>
                </div>
              ))
            ) : null}
          </div>
        </div>

        {/* 4. Description & Notes */}
        {product.description && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Catalog Notes & Description
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed p-3 rounded-lg bg-white/5 border border-white/10">
              {product.description}
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div>
            {canArchive && !product.isArchived && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose();
                  onArchive?.(product);
                }}
                leftIcon={<Trash2 className="w-4 h-4 text-rose-400" />}
              >
                Archive Product
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit?.(product);
                }}
                leftIcon={<Edit className="w-4 h-4" />}
              >
                Edit Product
              </Button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
