'use client';

import React, { useState, useEffect } from 'react';
import { Download, Ban, FileText, User, Store, Calendar, CreditCard, ShieldCheck, Printer, RotateCcw } from 'lucide-react';
import { Drawer, Button, Badge } from '../../../components/ui';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { getPaymentModeBadgeConfig, formatInvoiceNumber } from '../calculations';
import { invoicesApi } from '../api';
import { posApi } from '../../pos/api';
import { generateCanonicalReceipt, dispatchReceiptPrint, loadReceiptTemplate } from '../../../lib/utils/receiptDocument';
import type { Invoice } from '../types';
import type { ReceiptTemplate } from '../../pos/types';

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
  const [isPrinting, setIsPrinting] = useState(false);
  const [returnsHistory, setReturnsHistory] = useState<any[]>([]);

  const invoiceNo = invoice ? formatInvoiceNumber(invoice) : '';

  useEffect(() => {
    if (isOpen && invoiceNo) {
      posApi.getInvoiceReturns(invoiceNo).then((res) => {
        setReturnsHistory(res || []);
      }).catch(() => setReturnsHistory([]));
    }
  }, [isOpen, invoiceNo]);

  if (!invoice) return null;

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

  const handleThermalPrint = async () => {
    setIsPrinting(true);
    try {
      const template = (invoice.receiptTemplate || loadReceiptTemplate()) as Partial<ReceiptTemplate>;
      const receipt = generateCanonicalReceipt(invoice);
      await dispatchReceiptPrint(receipt, {
        paperWidthMm: template.paperWidthMm,
        template
      });
    } catch {} finally {
      setIsPrinting(false);
    }
  };

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
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} isArchived={invoice.isArchived} />
            <Badge variant={payConfig.variant} size="sm">
              {payConfig.label}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              isLoading={isPrinting}
              onClick={handleThermalPrint}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              Print Receipt
            </Button>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          {/* Customer info */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Customer Information</span>
            </div>
            <div className="font-bold text-slate-900 text-sm">
              {invoice.customerName || 'Walk-in Customer'}
            </div>
            {invoice.customerPhone && (
              <div className="text-slate-600 font-mono">
                Phone: {invoice.customerPhone}
              </div>
            )}
            {invoice.customerGst && (
              <div className="text-slate-600 font-mono">
                GSTIN: {invoice.customerGst}
              </div>
            )}
            {invoice.customerAddress && (
              <div className="text-slate-500">
                {invoice.customerAddress}
              </div>
            )}
          </div>

          {/* Store & Date Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
              <Store className="w-3.5 h-3.5 text-emerald-600" />
              <span>Store & Session Info</span>
            </div>
            <div className="text-slate-700">
              Outlet: <strong className="text-slate-900 font-mono">{invoice.locationId || invoice.storeId || 'Main Outlet'}</strong>
            </div>
            <div className="text-slate-700">
              Cashier: <strong className="text-slate-900">{invoice.cashierName || invoice.cashier || 'System'}</strong>
            </div>
            <div className="flex items-center gap-1 text-slate-500 font-mono pt-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
          <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Billed Items ({items.length})</span>
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((item, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">
                    {item.name}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="font-mono">{item.sku || 'No SKU'}</span>
                    <span>• {item.quantity} {item.unit || 'units'} × ₹{Number(item.price ?? item.sellingPrice ?? 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-mono font-bold text-slate-900 text-xs tabular-nums">
                    ₹{Number(item.lineTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  {item.tax ? (
                    <div className="text-[10px] text-slate-500 font-mono">
                      Tax: ₹{Number(item.tax).toFixed(2)}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Settlement Breakdown */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-xs">
          <div className="flex justify-between text-slate-600">
            <span>Taxable Subtotal:</span>
            <span className="font-mono text-slate-800 tabular-nums">
              ₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Discounts Applied:</span>
              <span className="font-mono text-rose-600 tabular-nums">
                - ₹ {discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex justify-between text-slate-600">
            <span>GST Tax Liability:</span>
            <span className="font-mono text-amber-700 tabular-nums">
              + ₹ {tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900">Grand Total Payable:</span>
            <span className="text-base font-mono font-bold text-emerald-700 tabular-nums">
              ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Returns & Exchanges History */}
        {returnsHistory.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
            <div className="font-bold text-amber-950 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-amber-700" />
                <span>Returns & Exchanges Recorded ({returnsHistory.length})</span>
              </div>
              <Badge variant="warning" size="sm">
                Total Refunded: ₹{returnsHistory.reduce((acc, r) => acc + (Number(r.refundAmount) || 0), 0).toFixed(2)}
              </Badge>
            </div>

            <div className="divide-y divide-amber-200/70 border border-amber-200 rounded-lg overflow-hidden bg-white">
              {returnsHistory.map((ret) => (
                <div key={ret.returnId || ret.id} className="p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-slate-900">#{ret.returnId}</span>
                    <span className="text-[11px] text-slate-500">{new Date(ret.createdAt || ret.timestamp).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>{ret.reason || 'Customer Return'} ({ret.refundMethod || 'CASH'})</span>
                    <span className="font-semibold text-rose-700">- ₹{Number(ret.refundAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Items: {(ret.returnedItems || []).map((it: any) => `${it.name} x${it.quantity}`).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Void / Audit Memo if voided */}
        {isVoided && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-rose-600" />
              <span>Invoice Voided Record</span>
            </div>
            <p className="text-[11px] text-rose-700">
              This invoice was voided on {invoice.voidedAt ? new Date(invoice.voidedAt).toLocaleString() : 'N/A'}. All inventory units were automatically reverted back to stock.
            </p>
          </div>
        )}
      </div>
    </Drawer>
  );
}
