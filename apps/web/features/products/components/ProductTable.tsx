'use client';

import React from 'react';
import {
  Package,
  Barcode,
  Eye,
  Edit,
  Trash2,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Badge,
  StatusBadge,
  Skeleton,
  EmptyState,
  Button
} from '../../../components/ui';
import { normalizePublicAssetUrl } from '../../../lib/utils/media';
import { calculateProductMargin } from '../calculations';
import type { ProductDoc } from '../types';

export interface ProductTableProps {
  products: ProductDoc[];
  isLoading?: boolean;
  canEdit?: boolean;
  canArchive?: boolean;
  highlightedIds?: Set<string>;
  onInspect: (product: ProductDoc) => void;
  onEdit: (product: ProductDoc) => void;
  onArchive: (product: ProductDoc) => void;
}

export function ProductTable({
  products,
  isLoading = false,
  canEdit = false,
  canArchive = false,
  highlightedIds = new Set(),
  onInspect,
  onEdit,
  onArchive
}: ProductTableProps) {
  if (isLoading) {
    return (
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 space-y-4 animate-pulse">
        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <Skeleton height={20} width={200} />
          <Skeleton height={20} width={120} />
        </div>
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-between py-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Skeleton height={40} width={40} className="rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton height={14} width={160} />
                <Skeleton height={10} width={100} />
              </div>
            </div>
            <Skeleton height={14} width={80} />
            <Skeleton height={14} width={80} />
            <Skeleton height={14} width={60} />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-8">
        <EmptyState
          title="No Product SKUs Found"
          description="No products match the selected search terms, category filters, or archive status."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Mobile Priority Card List (Block on < md, Hidden on md+) */}
      <div className="md:hidden space-y-3">
        {products.map((p) => {
          const margin = calculateProductMargin(
            p.sellingPrice || p.price || 0,
            p.purchasePrice || p.cost || 0
          );
          const imageUrl = p.image ? normalizePublicAssetUrl(p.image) : '';
          const isArchived = p.isArchived || p.status === 'archived';
          const isHighlighted = highlightedIds.has(String(p.id));

          return (
            <div
              key={p.id}
              className={`p-4 rounded-xl border border-white/10 bg-[#0f172a] shadow-xs space-y-3 transition-colors ${
                isHighlighted ? 'bg-blue-500/15 ring-1 ring-blue-500/30' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-[#131d33] border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">{p.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{p.brand || 'VC Organic'}</span>
                      <span>•</span>
                      <span className="font-mono text-blue-400 font-medium">{p.sku}</span>
                    </div>
                  </div>
                </div>
                <StatusBadge status={isArchived ? 'archived' : p.status || 'active'} size="sm" />
              </div>

              {/* Pricing & Stock Details */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#131d33] border border-white/5 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Selling Price</span>
                  <span className="font-bold text-white text-sm">
                    ₹{(p.sellingPrice || p.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-emerald-400 block">{margin}% margin</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Category</span>
                  <span className="text-slate-200 truncate block mt-0.5">{p.category || 'General'}</span>
                  <span className="text-[10px] text-slate-400 block">GST: {p.gst || 0}%</span>
                </div>
              </div>

              {/* Mobile Actions */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                  onClick={() => onInspect(p)}
                >
                  Inspect
                </Button>
                {canEdit && (
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Edit className="w-3.5 h-3.5" />}
                    onClick={() => onEdit(p)}
                  >
                    Edit
                  </Button>
                )}
                {canArchive && !isArchived && (
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => onArchive(p)}
                  >
                    Archive
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Desktop High-Density Table (Hidden on mobile, Visible on md+) */}
      <div className="hidden md:block bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table stickyHeader density="comfortable">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Product / Label</TableHead>
                <TableHead>SKU & Barcode</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Cost Price</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
                <TableHead className="text-center">GST</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const margin = calculateProductMargin(
                  p.sellingPrice || p.price || 0,
                  p.purchasePrice || p.cost || 0
                );
                const imageUrl = p.image ? normalizePublicAssetUrl(p.image) : '';
                const isArchived = p.isArchived || p.status === 'archived';
                const isHighlighted = highlightedIds.has(String(p.id));

                return (
                  <TableRow
                    key={p.id}
                    className={`transition-colors ${
                      isHighlighted
                        ? 'bg-blue-500/15 ring-1 ring-blue-500/30'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Product Name & Brand */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#131d33] border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate max-w-[200px] text-xs">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{p.brand || 'VC Organic'}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-300">
                              {p.unit || 'pc'}
                              {p.sellingMode === 'loose' || p.sellingMode === 'weight_based' ? ' (Loose)' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* SKU & Barcodes */}
                    <TableCell>
                      <div className="space-y-0.5 font-mono text-xs">
                        <div className="font-semibold text-blue-400">{p.sku}</div>
                        {p.barcode ? (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Barcode className="w-3 h-3 text-slate-500" />
                            <span>{p.barcode}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">No Barcode</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <Badge variant="neutral" size="sm">
                        {p.category || 'General'}
                      </Badge>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Badge
                        variant={(p.type || 'OWN').toUpperCase() === 'EXTERNAL' ? 'info' : 'brand'}
                        size="sm"
                      >
                        {(p.type || 'OWN').toUpperCase()}
                      </Badge>
                    </TableCell>

                    {/* Cost Price */}
                    <TableCell className="text-right font-mono text-xs text-slate-300">
                      ₹{(p.purchasePrice || p.cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>

                    {/* Selling Price & Margin */}
                    <TableCell className="text-right">
                      <div className="font-mono text-xs font-bold text-white">
                        ₹{(p.sellingPrice || p.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                        {margin}% margin
                      </div>
                    </TableCell>

                    {/* GST */}
                    <TableCell className="text-center font-mono text-xs text-slate-300">
                      {p.gst || 0}%
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      <StatusBadge status={isArchived ? 'archived' : p.status || 'active'} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onInspect(p)}
                          aria-label={`Inspect ${p.name}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-white/5 transition-colors cursor-pointer"
                          title="View Product Specifications"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(p)}
                            aria-label={`Edit ${p.name}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            title="Edit SKU Master"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {canArchive && !isArchived && (
                          <button
                            type="button"
                            onClick={() => onArchive(p)}
                            aria-label={`Archive ${p.name}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
                            title="Archive Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

