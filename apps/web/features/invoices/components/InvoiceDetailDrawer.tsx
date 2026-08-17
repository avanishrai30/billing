'use client';

import React from 'react';
import { Download, Ban, FileText, User, Store, Calendar, CreditCard, ShieldCheck } from 'lucide-react';
import { Drawer, Button, Badge } from '../../../components/ui';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { getPaymentModeBadgeConfig, formatInvoiceNumber } from '../calculations';
import { invoicesApi } from '../api';
import type { Invoice } from '../types';

export interface InvoiceDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  canVoid?: boolean;
  onOpenVoid: (invoice: Invoice) => void;
}

export function InvoiceDetailDrawer({
  isOpen,
  onClose,
  invoice,
  canVoid = false,
  onOpenVoid
}: InvoiceDetailDrawerProps) {
  if (!invoice) return null;

  const invoiceNo = formatInvoiceNumber(invoice);
  const isVoided = invoice.status === 'VOIDED' || invoice.isArchived;
  const payConfig = getPaymentModeBadgeConfig(invoice.paymentMode || invoice.paymentMethod);
  const items = invoice.items || [];
  const grandTotal = Number(invoice.grandTotal ?? invoice.grandtotal ?? 0);
  const subtotal = Number(invoice.subtotal ?? 0);
  const tax = Number(invoice.tax ?? 0);
  const discount = Number(invoice.discount ?? 0);

  const formattedDate = invoice.createdAt
    ? new Date(invoice.createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'N/A';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Tax Invoice #${invoiceNo}`}
      description="Detailed sales receipt, tax distribution, and customer settlement data"
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Status & Quick Action Banner */}
        <div className="p-3.5 rounded-2xl bg-[#0f172a] border border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} isArchived={invoice.isArchived} />
            <Badge variant={payConfig.variant} size="sm">
              {payConfig.label}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={invoicesApi.getPdfUrl(invoiceNo)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex"
            >
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download PDF
              </Button>
            </a>

            {canVoid && !isVoided && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenVoid(invoice);
                }}
                leftIcon={<Ban className="w-3.5 h-3.5" />}
              >
                Void Invoice
              </Button>
            )}
          </div>
        </div>

        {/* Header Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#0f172a] border border-white/10">
          {/* Customer info */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>Customer Information</span>
            </div>
            <div className="font-bold text-white text-sm">
              {invoice.customerName || 'Walk-in Customer'}
            </div>
            {invoice.customerPhone && (
              <div className="text-slate-300 font-mono">
                Phone: {invoice.customerPhone}
              </div>
            )}
            {invoice.customerGst && (
              <div className="text-slate-300 font-mono">
                GSTIN: {invoice.customerGst}
              </div>
            )}
            {invoice.customerAddress && (
              <div className="text-slate-400">
                {invoice.customerAddress}
              </div>
            )}
          </div>

          {/* Store & Date Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span>Store & Session Info</span>
            </div>
            <div className="text-slate-200">
              Outlet: <strong className="text-white font-mono">{invoice.locationId || invoice.storeId || 'Main Outlet'}</strong>
            </div>
            <div className="text-slate-300">
              Cashier: <strong className="text-white">{invoice.cashierName || invoice.cashier || 'System'}</strong>
            </div>
            <div className="flex items-center gap-1 text-slate-400 font-mono pt-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0f172a]">
          <div className="p-3 bg-[#0f172a] border-b border-white/10 font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            <span>Billed Items ({items.length})</span>
          </div>

          <div className="divide-y divide-white/5">
            {items.map((item, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-white/[0.02]">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">
                    {item.name}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="font-mono">{item.sku || 'No SKU'}</span>
                    <span>• {item.quantity} {item.unit || 'units'} × ₹{Number(item.price ?? item.sellingPrice ?? 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-mono font-bold text-white text-xs tabular-nums">
                    ₹{Number(item.lineTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  {item.tax ? (
                    <div className="text-[10px] text-slate-400 font-mono">
                      Tax: ₹{Number(item.tax).toFixed(2)}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Settlement Breakdown */}
        <div className="p-3.5 rounded-2xl bg-[#0f172a] border border-white/10 space-y-2">
          <div className="flex justify-between text-slate-400">
            <span>Taxable Subtotal:</span>
            <span className="font-mono text-slate-200 tabular-nums">
              ₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>Discounts Applied:</span>
              <span className="font-mono text-rose-400 tabular-nums">
                - ₹ {discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex justify-between text-slate-400">
            <span>GST Tax Liability:</span>
            <span className="font-mono text-amber-400 tabular-nums">
              + ₹ {tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="pt-2 border-t border-white/10 flex justify-between items-center">
            <span className="text-sm font-bold text-white">Grand Total Payable:</span>
            <span className="text-base font-mono font-bold text-emerald-400 tabular-nums">
              ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Void / Audit Memo if voided */}
        {isVoided && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span>Invoice Voided Record</span>
            </div>
            <p className="text-[11px] text-rose-200">
              This invoice was voided on {invoice.voidedAt ? new Date(invoice.voidedAt).toLocaleString() : 'N/A'}. All inventory units were automatically reverted back to stock.
            </p>
          </div>
        )}
      </div>
    </Drawer>
  );
}
