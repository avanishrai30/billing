'use client';

import React from 'react';
import { Eye, Edit, Trash2, Truck } from 'lucide-react';
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
import { formatSupplierContact, formatSupplierGst } from '../calculations';
import type { SupplierDoc } from '../types';

export interface SupplierTableProps {
  suppliers: SupplierDoc[];
  isLoading: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onViewDetail: (supplier: SupplierDoc) => void;
  onEditSupplier: (supplier: SupplierDoc) => void;
  onDeleteSupplier: (supplier: SupplierDoc) => void;
  onClearFilters?: () => void;
  isFiltered?: boolean;
}

export function SupplierTable({
  suppliers,
  isLoading,
  canEdit = false,
  canDelete = false,
  onViewDetail,
  onEditSupplier,
  onDeleteSupplier,
  onClearFilters,
  isFiltered = false
}: SupplierTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        {Array.from({ length: 8 }).map((_, idx) => (
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

  if (suppliers.length === 0) {
    return (
      <EmptyState
        icon={<Truck className="w-8 h-8 text-slate-400" />}
        title={isFiltered ? 'No Matching Suppliers Found' : 'No Suppliers Registered'}
        description={
          isFiltered
            ? 'No supplier records match your search criteria. Try a different query or reset filters.'
            : 'There are currently zero supplier profiles registered in the vendor directory.'
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
            <TableHead>Supplier Company Name</TableHead>
            <TableHead>Contact Number</TableHead>
            <TableHead>Email Address</TableHead>
            <TableHead>GSTIN / Tax ID</TableHead>
            <TableHead>Warehouse / Dispatch Address</TableHead>
            <TableHead align="right">Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {suppliers.map((sup) => {
            const formattedContact = formatSupplierContact(sup.contact);
            const gstDisplay = formatSupplierGst(sup.gst || sup.gstin);
            const isGstRegistered = gstDisplay !== 'Unregistered';

            return (
              <TableRow key={sup.id}>
                {/* Name */}
                <TableCell>
                  <div className="font-semibold text-slate-900 truncate max-w-[200px]" title={sup.name}>
                    {sup.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {sup.id}
                  </div>
                </TableCell>

                {/* Contact */}
                <TableCell>
                  <span className="font-mono text-slate-800 text-xs">
                    {formattedContact}
                  </span>
                </TableCell>

                {/* Email */}
                <TableCell>
                  <span className="text-slate-700 text-xs truncate max-w-[180px] block">
                    {sup.email || '-'}
                  </span>
                </TableCell>

                {/* GSTIN */}
                <TableCell>
                  {isGstRegistered ? (
                    <span className="font-mono font-bold text-amber-700 text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {gstDisplay}
                    </span>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      Unregistered
                    </Badge>
                  )}
                </TableCell>

                {/* Address */}
                <TableCell>
                  <span className="text-slate-600 text-xs truncate max-w-[220px] block" title={sup.address || ''}>
                    {sup.address || '-'}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell align="right">
                  <div className="flex items-center justify-end gap-1.5">
                    <IconButton
                      aria-label={`View history and details for ${sup.name}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetail(sup)}
                      icon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                    />
                    {canEdit && (
                      <IconButton
                        aria-label={`Edit profile for ${sup.name}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditSupplier(sup)}
                        icon={<Edit className="w-3.5 h-3.5 text-slate-600" />}
                      />
                    )}
                    {canDelete && (
                      <IconButton
                        aria-label={`Delete supplier ${sup.name}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteSupplier(sup)}
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
