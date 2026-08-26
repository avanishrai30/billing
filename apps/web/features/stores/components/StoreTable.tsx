'use client';

import React from 'react';
import Link from 'next/link';
import { Edit, Trash2, Store, Users, Share2, Package, ShoppingCart } from 'lucide-react';
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
  IconButton,
  Button
} from '../../../components/ui';
import type { StoreDoc } from '../types';

export interface StoreTableProps {
  stores: StoreDoc[];
  isLoading: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  isSuperAdmin?: boolean;
  onEditStore: (store: StoreDoc) => void;
  onDeleteStore: (store: StoreDoc) => void;
  onManageEmployees: (store: StoreDoc) => void;
  onToggleHubStatus: (store: StoreDoc) => void;
  onClearFilters?: () => void;
  isFiltered?: boolean;
}

export function StoreTable({
  stores,
  isLoading,
  canEdit = false,
  canDelete = false,
  isSuperAdmin = false,
  onEditStore,
  onDeleteStore,
  onManageEmployees,
  onToggleHubStatus,
  onClearFilters,
  isFiltered = false
}: StoreTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <Table density="dense">
        <TableHeader>
          <tr>
            <TableHead>Store / Outlet Name</TableHead>
            <TableHead>Branch Code</TableHead>
            <TableHead>Location Address</TableHead>
            <TableHead>Assigned Team</TableHead>
            <TableHead>Hub Status</TableHead>
            <TableHead>Operating Status</TableHead>
            <TableHead align="right">Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {stores.map((store) => {
            const isActive = store.status === 'active';
            const empCount = store.employeeCount ?? 0;

            return (
              <TableRow key={store.id}>
                {/* Store Name & ID */}
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${store.isHub ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                      {store.isHub ? <Share2 className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 truncate max-w-[180px]" title={store.name}>
                        {store.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {store.id}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Code */}
                <TableCell>
                  <span className="font-mono font-bold text-blue-700 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {store.code || 'N/A'}
                  </span>
                </TableCell>

                {/* Address */}
                <TableCell>
                  <span className="text-slate-600 text-xs truncate max-w-[200px] block" title={store.address || ''}>
                    {store.address || '—'}
                  </span>
                </TableCell>

                {/* Assigned Employees */}
                <TableCell>
                  <button
                    onClick={() => onManageEmployees(store)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors text-xs font-semibold cursor-pointer group"
                    title="View and manage assigned team members"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-600" />
                    <span>{empCount} {empCount === 1 ? 'employee' : 'employees'}</span>
                  </button>
                </TableCell>

                {/* Hub Status */}
                <TableCell>
                  {store.isHub ? (
                    <Badge variant="brand" size="sm" dot>
                      DISTRIBUTION HUB
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-400 font-mono">Standard</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant={isActive ? 'success' : 'neutral'} size="sm" dot={isActive}>
                    {isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </TableCell>

                {/* Actions */}
                <TableCell align="right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onManageEmployees(store)}
                      aria-label={`Manage team for ${store.name}`}
                      title="Manage Store Team"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                    </button>

                    {isSuperAdmin && (
                      <button
                        onClick={() => onToggleHubStatus(store)}
                        aria-label={store.isHub ? `Remove Hub status for ${store.name}` : `Set ${store.name} as Hub`}
                        title={store.isHub ? "Demote from Distribution Hub" : "Promote to Distribution Hub"}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${store.isHub ? 'text-purple-600 hover:bg-purple-50' : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'}`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <Link
                      href={`/inventory?storeId=${encodeURIComponent(store.id)}`}
                      title="View Store Inventory"
                      aria-label={`View inventory for ${store.name}`}
                      className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors inline-flex items-center"
                    >
                      <Package className="w-3.5 h-3.5" />
                    </Link>

                    <Link
                      href={`/invoices?storeId=${encodeURIComponent(store.id)}`}
                      title="View Store Sales"
                      aria-label={`View sales for ${store.name}`}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </Link>

                    {canEdit && (
                      <IconButton
                        aria-label={`Edit store outlet ${store.name}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditStore(store)}
                        icon={<Edit className="w-3.5 h-3.5 text-slate-600" />}
                      />
                    )}
                    {canDelete && (
                      <IconButton
                        aria-label={`Delete store outlet ${store.name}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteStore(store)}
                        icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
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
