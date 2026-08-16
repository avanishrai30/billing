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
  if (isLoading) {
    return (
      <div className="bg-[#021b47] border border-white/10 rounded-2xl p-6 text-center text-slate-400 text-sm">
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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#021b47]">
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
                  <div className="font-semibold text-white truncate max-w-[200px]" title={fran.name}>
                    {fran.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                    {fran.location}
                  </div>
                </TableCell>

                {/* Owner & Contact */}
                <TableCell>
                  <div className="text-xs text-slate-200 font-medium">{fran.owner}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {fran.phone || fran.email || '—'}
                  </div>
                </TableCell>

                {/* GSTIN */}
                <TableCell>
                  <span className="font-mono text-xs text-slate-300">
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
                      icon={<Eye className="h-4 w-4 text-blue-400" />}
                    />
                    {canManage && (
                      <>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          onClick={() => onRecordSupply(fran)}
                          aria-label={`Record supply dispatch for ${fran.name}`}
                          icon={<Package className="h-4 w-4 text-emerald-400" />}
                        />
                        <IconButton
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditFranchise(fran)}
                          aria-label={`Edit franchise ${fran.name}`}
                          icon={<Edit2 className="h-4 w-4 text-slate-300" />}
                        />
                        <IconButton
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteFranchise(fran)}
                          aria-label={`Delete franchise ${fran.name}`}
                          icon={<Trash2 className="h-4 w-4 text-rose-400" />}
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
  );
}
