'use client';

import React from 'react';
import {
  Package,
  Barcode,
  Eye,
  Edit,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Printer
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
import { formatDisplayDate } from '../../../lib/utils/labelProfiles';
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
  onPrintBarcode?: (product: ProductDoc) => void;
}

export function ProductTable({
  products,
  isLoading = false,
  canEdit = false,
  canArchive = false,
  highlightedIds = new Set(),
  onInspect,
  onEdit,
  onArchive,
  onPrintBarcode
}: ProductTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 animate-pulse shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex justify-between items-center pb-4 border-b border-slate-200">
          <Skeleton height={20} width={200} />
          <Skeleton height={20} width={120} />
        </div>
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-100">
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
      <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <EmptyState
          title="No Product SKUs Found"
          description="No products match the selected search terms, category filters, or archive status."
        />
      </div>
    );
  }

  return (
        <Table stickyHeader density="comfortable">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">Product / Label</TableHead>
              <TableHead>SKU & Barcode</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Cost Price</TableHead>
              <TableHead className="text-right">Selling Price</TableHead>
              <TableHead className="hidden md:table-cell text-center">GST</TableHead>
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
                      ? 'bg-blue-50 ring-1 ring-blue-200'
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Product Name & Brand */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
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
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate max-w-[200px] text-xs">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{p.brand || 'VC Organic'}</span>
                          <span>/</span>
                          <span className="font-mono text-slate-600">
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
                      <div className="font-semibold text-blue-600">{p.sku}</div>
                      {p.barcode ? (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Barcode className="w-3 h-3 text-slate-400" />
                          <span>{p.barcode}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No Barcode</span>
                      )}
                      {(p.defaultExpiryDate || p.doe) && (
                        <div className="text-[10px] text-slate-500 font-sans flex items-center gap-1">
                          <span className="text-slate-400">EXP:</span>
                          <span className="font-mono text-slate-700">{formatDisplayDate(p.defaultExpiryDate || p.doe)}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Category */}
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="neutral" size="sm">
                      {p.category || 'General'}
                    </Badge>
                  </TableCell>

                  {/* Type */}
                  <TableCell className="hidden md:table-cell">
                    <Badge
                      variant={(p.type || 'OWN').toUpperCase() === 'EXTERNAL' ? 'info' : 'brand'}
                      size="sm"
                    >
                      {(p.type || 'OWN').toUpperCase()}
                    </Badge>
                  </TableCell>

                  {/* Cost Price */}
                  <TableCell className="hidden lg:table-cell text-right font-mono text-xs text-slate-600">
                    ₹{(p.purchasePrice || p.cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>

                  {/* Selling Price & Margin */}
                  <TableCell className="text-right">
                    <div className="font-mono text-xs font-bold text-slate-900">
                      ₹{(p.sellingPrice || p.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-700 mt-0.5 font-medium">
                      {margin}% margin
                    </div>
                  </TableCell>

                  {/* GST */}
                  <TableCell className="hidden md:table-cell text-center font-mono text-xs text-slate-600">
                    {p.gst || 0}%
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    <StatusBadge status={isArchived ? 'archived' : p.status || 'active'} />
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onPrintBarcode && (
                        <button
                          type="button"
                          onClick={() => onPrintBarcode(p)}
                          aria-label={`Print barcode for ${p.name}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Print Barcode & Batch Labels"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onInspect(p)}
                        aria-label={`Inspect ${p.name}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="View Product Specifications"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(p)}
                          aria-label={`Edit ${p.name}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
  );
}
