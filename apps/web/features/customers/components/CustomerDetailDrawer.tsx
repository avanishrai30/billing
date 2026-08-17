'use client';

import React from 'react';
import { User, Phone, Mail, FileCheck, MapPin, Receipt, Edit, Download, ShoppingBag } from 'lucide-react';
import { Drawer, Button, Badge, Skeleton, EmptyState } from '../../../components/ui';
import { useInvoicesQuery } from '../../invoices/hooks';
import { invoicesApi } from '../../invoices/api';
import { InvoiceStatusBadge } from '../../invoices/components/InvoiceStatusBadge';
import { formatCustomerPhone, formatCustomerGst } from '../calculations';
import type { CustomerDoc } from '../types';

export interface CustomerDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerDoc | null;
  canEdit?: boolean;
  onOpenEdit: (customer: CustomerDoc) => void;
}

export function CustomerDetailDrawer({
  isOpen,
  onClose,
  customer,
  canEdit = false,
  onOpenEdit
}: CustomerDetailDrawerProps) {
  const { data: invoicesRes, isLoading: isLoadingInvoices } = useInvoicesQuery({
    customerId: customer?.id,
    limit: 50
  });

  if (!customer) return null;

  const invoices = invoicesRes?.invoices || [];
  const formattedPhone = formatCustomerPhone(customer.phone);
  const gstDisplay = formatCustomerGst(customer.gstin || customer.gst);

  // Compute customer purchase statistics from invoices
  const activeInvoices = invoices.filter((i) => i.status !== 'VOIDED' && !i.isArchived);
  const totalSpend = activeInvoices.reduce(
    (sum, inv) => sum + Number(inv.grandTotal ?? inv.grandtotal ?? 0),
    0
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={customer.name}
      description={`Customer Account #${customer.id}`}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Profile Card & Action Banner */}
        <div className="p-4 rounded-2xl bg-[#0f172a] border border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">{customer.name}</h2>
              {gstDisplay !== 'Unregistered' && (
                <Badge variant="info" size="sm">
                  GST Verified
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-slate-300">
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-sky-400" />
                {formattedPhone}
              </span>
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                  {customer.email}
                </span>
              )}
            </div>
          </div>

          {canEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenEdit(customer);
              }}
              leftIcon={<Edit className="w-3.5 h-3.5" />}
            >
              Edit Profile
            </Button>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#0f172a] border border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tax & Identification</span>
            </div>
            <div className="text-slate-200 font-mono text-[11px]">
              GSTIN: <strong className="text-white">{gstDisplay}</strong>
            </div>
            <div className="text-slate-400 text-[11px]">
              Registered: {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Billing Address</span>
            </div>
            <div className="text-slate-300 text-[11px] leading-relaxed">
              {customer.address || 'No billing address specified on profile'}
            </div>
          </div>
        </div>

        {/* Lifetime Sales Statistics Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-[#0f172a] border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Total Orders</span>
              <Receipt className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-lg font-mono font-bold text-white tabular-nums">
              {activeInvoices.length} Bills
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0f172a] border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Total Billed Spend</span>
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums">
              ₹ {totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Customer Invoice History Ledger */}
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0f172a]">
          <div className="p-3 bg-[#0f172a] border-b border-white/10 font-bold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-sky-400" />
              <span>Purchase History ({invoices.length})</span>
            </div>
          </div>

          {isLoadingInvoices ? (
            <div className="p-4 space-y-2">
              <Skeleton variant="text" className="w-full h-4" />
              <Skeleton variant="text" className="w-3/4 h-4" />
            </div>
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-6 h-6 text-slate-400" />}
              title="No Sales Invoices Recorded"
              description="This customer has zero completed purchase transactions recorded in the system."
            />
          ) : (
            <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
              {invoices.map((inv) => {
                const isVoided = inv.status === 'VOIDED' || inv.isArchived;
                const grandTotal = Number(inv.grandTotal ?? inv.grandtotal ?? 0);
                const invDate = inv.createdAt
                  ? new Date(inv.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })
                  : 'N/A';

                return (
                  <div
                    key={inv.id || inv._id || inv.invoiceNumber}
                    className={`p-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] ${
                      isVoided ? 'opacity-50 bg-rose-500/[0.02]' : ''
                    }`}
                  >
                    <div>
                      <div className="font-mono font-bold text-white text-xs">
                        {inv.invoiceNumber || inv.id}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {invDate} • {inv.items?.length || 0} items • {inv.locationId || 'Store'}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-mono font-bold text-white text-xs tabular-nums">
                          ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <InvoiceStatusBadge status={inv.status} isArchived={inv.isArchived} />
                      </div>

                      <a
                        href={invoicesApi.getPdfUrl(inv.invoiceNumber || inv.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex"
                      >
                        <Button variant="ghost" size="sm" aria-label={`Download PDF for ${inv.invoiceNumber}`}>
                          <Download className="w-3.5 h-3.5 text-slate-300" />
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
