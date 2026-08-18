'use client';

import React from 'react';
import { Eye, Edit2, Trash2, Package, Store } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  EmptyState,
  IconButton
} from '../../../components/ui';
import type { FranchiseDoc } from '../types';

export interface FranchiseTableProps {
  franchises: FranchiseDoc[];
  isLoading: boolean;
  canManage: boolean;
  onViewDetail: (franchise: FranchiseDoc) => void;
  onRecordSupply: (franchise: FranchiseDoc) => void;
  onEditFranchise: (franchise: FranchiseDoc) => void;
  onDeleteFranchise: (franchise: FranchiseDoc) => void;
  onClearFilters?: () => void;
  isFiltered?: boolean;
}

export function FranchiseTable({
  franchises,
  isLoading,
  canManage,
  onViewDetail,
  onRecordSupply,
  onEditFranchise,
  onDeleteFranchise,
  onClearFilters,
  isFiltered = false
}: FranchiseTableProps) {
  const [isMobileLayout, setIsMobileLayout] = React.useState(false);

  React.useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncLayout = () => setIsMobileLayout(mediaQuery.matches);

    syncLayout();
    mediaQuery.addEventListener('change', syncLayout);
    return () => mediaQuery.removeEventListener('change', syncLayout);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-sm shadow-xs">
        Loading franchise partners...
      </div>
    );
  }

  if (franchises.length === 0) {
    return (
      <EmptyState
        icon={<Store className="w-8 h-8 text-slate-400" />}
        title={isFiltered ? 'No Matching Franchise Partners' : 'No Franchise Partners Registered'}
        description={
          isFiltered
            ? 'No franchise partner matches your current search criteria. Try clearing search filters.'
            : 'Register your first franchise partner to manage wholesale supply agreements and outbound dispatches.'
        }
        actionLabel={isFiltered ? 'Reset Filters' : undefined}
        onAction={isFiltered ? onClearFilters : undefined}
      />
    );
  }

  return (
    <>
      {isMobileLayout && (
      <div className="space-y-3">
        {franchises.map((fran) => {
          const itemCount = fran.supplyList ? fran.supplyList.length : 0;

          return (
            <article key={fran.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate" title={fran.name}>
                    {fran.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{fran.location}</div>
                </div>
                {fran.status === 'active' ? (
                  <Badge variant="success" size="sm" dot>
                    Active
                  </Badge>
                ) : fran.status === 'suspended' ? (
                  <Badge variant="danger" size="sm" dot>
                    Suspended
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm" dot>
                    Inactive
                  </Badge>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-1.5 text-[11px] text-slate-600">
                <span>
                  Owner: <strong className="text-slate-900">{fran.owner}</strong>
                </span>
                <span className="font-mono">{fran.phone || fran.email || 'N/A'}</span>
                <span className="font-mono">GSTIN: {fran.gstin || 'Unregistered'}</span>
                <Badge variant={itemCount > 0 ? 'info' : 'neutral'} size="sm">
                  {itemCount} {itemCount === 1 ? 'Product' : 'Products'}
                </Badge>
              </div>

              <div className="mt-3 flex items-center justify-end gap-1">
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetail(fran)}
                  aria-label={`View franchise details for ${fran.name}`}
                  icon={<Eye className="h-4 w-4 text-blue-600" />}
                />
                {canManage && (
                  <>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={() => onRecordSupply(fran)}
                      aria-label={`Record supply dispatch for ${fran.name}`}
                      icon={<Package className="h-4 w-4 text-emerald-600" />}
                    />
                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditFranchise(fran)}
                      aria-label={`Edit franchise ${fran.name}`}
                      icon={<Edit2 className="h-4 w-4 text-slate-600" />}
                    />
                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteFranchise(fran)}
                      aria-label={`Delete franchise ${fran.name}`}
                      icon={<Trash2 className="h-4 w-4 text-rose-600" />}
                    />
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
      )}

      {!isMobileLayout && (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <Table density="dense">
        <TableHeader>
          <tr>
            <TableHead>Franchise Outlet</TableHead>
            <TableHead>Owner / Contact</TableHead>
            <TableHead>GSTIN</TableHead>
            <TableHead align="center">Supply Catalog</TableHead>
            <TableHead align="center">Status</TableHead>
            <TableHead align="right">Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {franchises.map((fran) => {
            const itemCount = fran.supplyList ? fran.supplyList.length : 0;

            return (
              <TableRow key={fran.id}>
                {/* Franchise Outlet */}
                <TableCell>
                  <div className="font-semibold text-slate-900 truncate max-w-[200px]" title={fran.name}>
                    {fran.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {fran.location}
                  </div>
                </TableCell>

                {/* Owner & Contact */}
                <TableCell>
                  <div className="text-xs text-slate-800 font-medium">{fran.owner}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {fran.phone || fran.email || 'N/A'}
                  </div>
                </TableCell>

                {/* GSTIN */}
                <TableCell>
                  <span className="font-mono text-xs text-slate-700">
                    {fran.gstin || 'Unregistered'}
                  </span>
                </TableCell>

                {/* Supply Catalog */}
                <TableCell align="center">
                  <Badge variant={itemCount > 0 ? 'info' : 'neutral'} size="sm">
                    {itemCount} {itemCount === 1 ? 'Product' : 'Products'}
                  </Badge>
                </TableCell>

                {/* Status */}
                <TableCell align="center">
                  {fran.status === 'active' ? (
                    <Badge variant="success" size="sm" dot>
                      Active
                    </Badge>
                  ) : fran.status === 'suspended' ? (
                    <Badge variant="danger" size="sm" dot>
                      Suspended
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm" dot>
                      Inactive
                    </Badge>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell align="right">
                  <div className="flex items-center justify-end gap-1">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetail(fran)}
                      aria-label={`View franchise details for ${fran.name}`}
                      icon={<Eye className="h-4 w-4 text-blue-600" />}
                    />
                    {canManage && (
                      <>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          onClick={() => onRecordSupply(fran)}
                          aria-label={`Record supply dispatch for ${fran.name}`}
                          icon={<Package className="h-4 w-4 text-emerald-600" />}
                        />
                        <IconButton
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditFranchise(fran)}
                          aria-label={`Edit franchise ${fran.name}`}
                          icon={<Edit2 className="h-4 w-4 text-slate-600" />}
                        />
                        <IconButton
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteFranchise(fran)}
                          aria-label={`Delete franchise ${fran.name}`}
                          icon={<Trash2 className="h-4 w-4 text-rose-600" />}
                        />
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
      )}
    </>
  );
}
