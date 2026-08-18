'use client';

import React from 'react';
import { Eye, Edit, Trash2, Users } from 'lucide-react';
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
import { formatCustomerPhone, formatCustomerGst } from '../calculations';
import type { CustomerDoc } from '../types';

export interface CustomerTableProps {
  customers: CustomerDoc[];
  isLoading: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onViewDetail: (customer: CustomerDoc) => void;
  onEditCustomer: (customer: CustomerDoc) => void;
  onDeleteCustomer: (customer: CustomerDoc) => void;
  onClearFilters?: () => void;
  isFiltered?: boolean;
}

export function CustomerTable({
  customers,
  isLoading,
  canEdit = false,
  canDelete = false,
  onViewDetail,
  onEditCustomer,
  onDeleteCustomer,
  onClearFilters,
  isFiltered = false
}: CustomerTableProps) {
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

  if (customers.length === 0) {
    return (
      <EmptyState
        icon={<Users className="w-8 h-8 text-slate-400" />}
        title={isFiltered ? 'No Matching Customers Found' : 'No Customers Registered'}
        description={
          isFiltered
            ? 'No customer records match your search criteria. Try a different query or reset filters.'
            : 'There are currently zero customer profiles registered in the CRM directory.'
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
            <TableHead>Customer Name</TableHead>
            <TableHead>Phone Number</TableHead>
            <TableHead>Email Address</TableHead>
            <TableHead>GSTIN / Tax ID</TableHead>
            <TableHead>Billing Address</TableHead>
            <TableHead align="right">Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {customers.map((cust) => {
            const formattedPhone = formatCustomerPhone(cust.phone);
            const gstDisplay = formatCustomerGst(cust.gstin || cust.gst);
            const isGstRegistered = gstDisplay !== 'Unregistered';

            return (
              <TableRow key={cust.id}>
                {/* Name */}
                <TableCell>
                  <div className="font-semibold text-slate-900 truncate max-w-[200px]" title={cust.name}>
                    {cust.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {cust.id}
                  </div>
                </TableCell>

                {/* Phone */}
                <TableCell>
                  <span className="font-mono text-slate-800 text-xs">
                    {formattedPhone}
                  </span>
                </TableCell>

                {/* Email */}
                <TableCell>
                  <span className="text-slate-700 text-xs truncate max-w-[180px] block">
                    {cust.email || '-'}
                  </span>
                </TableCell>

                {/* GSTIN */}
                <TableCell>
                  {isGstRegistered ? (
                    <span className="font-mono font-bold text-blue-700 text-[11px] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
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
                  <span className="text-slate-600 text-xs truncate max-w-[220px] block" title={cust.address || ''}>
                    {cust.address || '-'}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell align="right">
                  <div className="flex items-center justify-end gap-1.5">
                    <IconButton
                      aria-label={`View history and details for ${cust.name}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetail(cust)}
                      icon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                    />
                    {canEdit && (
                      <IconButton
                        aria-label={`Edit profile for ${cust.name}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditCustomer(cust)}
                        icon={<Edit className="w-3.5 h-3.5 text-slate-600" />}
                      />
                    )}
                    {canDelete && (
                      <IconButton
                        aria-label={`Delete customer ${cust.name}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteCustomer(cust)}
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
