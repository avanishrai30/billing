'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle2, Printer, RefreshCw, Eye, Plus, AlertTriangle, FileText, Download } from 'lucide-react';
import { Dialog, Button, Badge } from '../../../components/ui';
import { generateCanonicalReceipt, dispatchReceiptPrint, formatReceiptHtml } from '../../../lib/utils/receiptDocument';
import type { POSInvoiceDoc, POSReceiptData } from '../types';

export interface POSSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: POSInvoiceDoc | null;
  storeName?: string;
  autoPrint?: boolean;
  onNewSale: () => void;
}

export function POSSuccessModal({
  isOpen,
  onClose,
  invoice,
  storeName = 'VC Organic Outlet',
  autoPrint = true,
  onNewSale
}: POSSuccessModalProps) {
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'success' | 'offline' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const autoPrintedInvoicesRef = useRef<Set<string>>(new Set());

  const receiptData: POSReceiptData | null = React.useMemo(() => {
    if (!invoice) return null;
    return generateCanonicalReceipt(invoice, { name: storeName }, null);
  }, [invoice, storeName]);

  const handlePrint = useCallback(async () => {
    if (!receiptData) return;
    setPrintStatus('printing');
    setStatusMessage('Dispatching receipt to thermal printer...');

    try {
      const res = await dispatchReceiptPrint(receiptData);
      if (res.success) {
        setPrintStatus('success');
        setStatusMessage(res.method === 'native' ? 'Receipt printed on thermal printer ✓' : 'Receipt sent to printer ✓');
      } else {
        setPrintStatus('offline');
        setStatusMessage(res.message || 'Printer offline — sale completed successfully.');
      }
    } catch (err: any) {
      setPrintStatus('offline');
      setStatusMessage('Printer offline — sale recorded in ledger.');
    }
  }, [receiptData]);

  // Auto-print on first mount if enabled
  useEffect(() => {
    const invoiceKey = invoice?.invoiceNumber || invoice?.id;
    if (isOpen && invoice && invoiceKey && autoPrint && !autoPrintedInvoicesRef.current.has(invoiceKey)) {
      autoPrintedInvoicesRef.current.add(invoiceKey);
      handlePrint();
    } else if (isOpen) {
      setPrintStatus('idle');
    }
  }, [isOpen, invoice, autoPrint, handlePrint]);

  if (!invoice || !receiptData) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Sale Completed Successfully"
      description={`Tax Invoice #${invoice.invoiceNumber} recorded in sales ledger`}
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            isLoading={printStatus === 'printing'}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Again
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              leftIcon={<Eye className="w-3.5 h-3.5" />}
            >
              {showPreview ? 'Hide Preview' : 'View Receipt'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onNewSale();
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Sale
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Success & Print Status Banner */}
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <div className="text-sm font-semibold text-emerald-950">Payment Settled & Stock Decremented</div>
            <div className="text-xs text-emerald-800 flex items-center justify-between">
              <span>{statusMessage || 'Sale transaction recorded.'}</span>
              {printStatus === 'success' && <Badge variant="success" size="sm">Printed</Badge>}
              {printStatus === 'offline' && <Badge variant="warning" size="sm">Printer Offline</Badge>}
            </div>
          </div>
        </div>

        {/* Transaction Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>Invoice Number</span>
            <span className="font-mono font-semibold text-slate-900">#{invoice.invoiceNumber}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Customer</span>
            <span className="font-semibold text-slate-900">{invoice.customerName || 'Walk-in Customer'}</span>
          </div>
          {invoice.customerPhone && (
            <div className="flex items-center justify-between text-slate-600">
              <span>Phone</span>
              <span className="font-mono text-slate-700">{invoice.customerPhone}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-slate-600">
            <span>Items Count</span>
            <span className="font-semibold text-slate-900">{invoice.items?.length || 0} item(s)</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Payment Mode</span>
            <Badge variant="info" size="sm">{invoice.paymentMode}</Badge>
          </div>
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-bold text-slate-950">
            <span>Grand Total</span>
            <span className="text-emerald-700">₹{invoice.grandTotal?.toFixed(2)}</span>
          </div>
        </div>

        {/* Inline Thermal Receipt Preview */}
        {showPreview && (
          <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-inner max-h-72 overflow-y-auto font-mono text-[11px] leading-tight text-slate-900">
            <div className="text-center font-bold text-xs uppercase mb-1">{receiptData.businessName}</div>
            <div className="text-center text-slate-600 mb-2">{receiptData.storeName}</div>
            <div className="border-t border-dashed border-slate-400 my-2" />
            <div className="flex justify-between">
              <span>Inv: #{receiptData.receiptNumber}</span>
              <span>{new Date(receiptData.date).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Cust: {receiptData.customerName}</span>
              <span>{receiptData.customerPhone || ''}</span>
            </div>
            <div className="border-t border-dashed border-slate-400 my-2" />
            <div className="space-y-1">
              {receiptData.items.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="truncate pr-2">{it.name} x{it.quantity}</span>
                  <span className="shrink-0 font-semibold">₹{it.lineTotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-slate-400 my-2" />
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{receiptData.subtotal.toFixed(2)}</span>
            </div>
            {receiptData.tax > 0 && (
              <div className="flex justify-between">
                <span>GST Tax</span>
                <span>₹{receiptData.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t-2 border-slate-900 my-1" />
            <div className="flex justify-between font-bold text-xs">
              <span>GRAND TOTAL</span>
              <span>₹{receiptData.grandTotal.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-slate-900 my-1" />
            <div className="text-center text-[10px] text-slate-500 mt-2">
              {receiptData.termsAndConditions}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
