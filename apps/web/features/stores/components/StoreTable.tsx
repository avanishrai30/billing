'use client';

import React from 'react';
import { Edit, Trash2, Store } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  EmptyState,
  Skeleton,
  IconButton
} from '../../../components/ui';
import type { StoreDoc } from '../types';

export interface StoreTableProps {
  stores: StoreDoc[];
  isLoading: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onEditStore: (store: StoreDoc) => void;
  onDeleteStore: (store: StoreDoc) => void;
  onClearFilters?: () => void;
  isFiltered?: boolean;
}

export function StoreTable({
  stores,
  isLoading,
  canEdit = false,
  canDelete = false,
  onEditStore,
  onDeleteStore,
  onClearFilters,
  isFiltered = false
}: StoreTableProps) {
  if (isLoading) {
    return (
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 py-2">
            <Skeleton variant="text" className="w-1/4 h-5" />
            <Skeleton variant="text" className="w-1/6 h-5" />
            <Skeleton variant="text" className="w-1/8 h-5" />
            <Skeleton variant="rectangular" className="w-20 h-6 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <EmptyState
        icon={<Store className="w-8 h-8 text-slate-400" />}
        title={isFiltered ? 'No Matching Outlets Found' : 'No Store Outlets Registered'}
        description={
          isFiltered
            ? 'No store branch records match your search criteria. Try a different query or reset filters.'
            : 'There are currently zero store outlets registered in the directory.'
        }
        actionLabel={isFiltered ? 'Reset Filters' : undefined}
        onAction={isFiltered ? onClearFilters : undefined}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a]">
      <Table density="dense">
        <TableHeader>
          <tr>
            <TableHead>Store / Outlet Name</TableHead>
            <TableHead>Branch Code</TableHead>
            <TableHead>Location Address</TableHead>
            <TableHead>Contact Phone</TableHead>
            <TableHead>Operating Status</TableHead>
            <TableHead align="right">Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {stores.map((store) => {
            const isActive = store.status === 'active';

            return (
              <TableRow key={store.id}>
                {/* Store Name & ID */}
                <TableCell>
                  <div className="font-semibold text-white truncate max-w-[200px]" title={store.name}>
                    {store.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {store.id}
                  </div>
                </TableCell>

                {/* Code */}
                <TableCell>
                  <span className="font-mono font-bold text-sky-400 text-xs bg-sky-500/10 px-2 py-0.5 rounded border border-sky-400/20">
                    {store.code || 'N/A'}
                  </span>
                </TableCell>

                {/* Address */}
                <TableCell>
                  <span className="text-slate-300 text-xs truncate max-w-[240px] block" title={store.address || ''}>
                    {store.address || '-'}
                  </span>
                </TableCell>

                {/* Phone */}
                <TableCell>
                  <span className="font-mono text-slate-400 text-xs">
                    {store.phone || '-'}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant={isActive ? 'success' : 'neutral'} size="sm" dot={isActive}>
                    {isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </TableCell>

                {/* Actions */}
                <TableCell align="right">
                  <div className="flex items-center justify-end gap-1.5">
                    {canEdit && (
                      <IconButton
                        aria-label={`Edit store outlet ${store.name}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditStore(store)}
                        icon={<Edit className="w-3.5 h-3.5 text-amber-400" />}
                      />
                    )}
                    {canDelete && (
                      <IconButton
                        aria-label={`Delete store outlet ${store.name}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteStore(store)}
                        icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
