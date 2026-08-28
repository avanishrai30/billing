'use client';

import React, { useState, useCallback } from 'react';
import { Search, RotateCcw, ArrowLeftRight, Check, AlertCircle, ShoppingBag, ArrowLeft, Trash2, Phone } from 'lucide-react';
import { Dialog, Button, FormField, Input, Badge, Select } from '../../../components/ui';
import { posApi } from '../api';
import { useReturnMutation } from '../hooks';
import { formatPhoneDisplay } from '../calculations';
import type { POSReturnItem } from '../types';

export interface ReturnExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInitiateExchange: (returnSession: {
    originalInvoice: any;
    returnedItems: Array<{ productId: string; name: string; quantity: number; price: number; gst?: number; lineTotal: number }>;
    returnCredit: number;
  }) => void;
}

export function ReturnExchangeModal({
  isOpen,
  onClose,
  onInitiateExchange
}: ReturnExchangeModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [refundMethod, setRefundMethod] = useState<string>('CASH');
  const [returnReason, setReturnReason] = useState<string>('Customer Request');
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const returnMutation = useReturnMutation();

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    setError(null);
    setSelectedInvoice(null);
    setReturnQuantities({});

    try {
      const results = await posApi.searchReturnInvoices(q);
      setSearchResults(results);
      if (results.length === 0) {
        setError(`No matching sales found for "${q}".`);
      }
    } catch (err: any) {
      setError(err?.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSelectInvoice = (inv: any) => {
    setSelectedInvoice(inv);
    setError(null);
    setSuccessMessage(null);
    // Initialize return quantities to 0
    const initialQty: Record<string, number> = {};
    for (const it of inv.items || []) {
      const pid = it.productId || it.id;
      initialQty[pid] = 0;
    }
    setReturnQuantities(initialQty);
  };

  const handleQuantityChange = (productId: string, qty: number, maxQty: number) => {
    const validQty = Math.max(0, Math.min(maxQty, qty));
    setReturnQuantities((prev) => ({
      ...prev,
      [productId]: validQty
    }));
  };

  // Calculate total return credit & items to return
  const selectedReturnItems = React.useMemo(() => {
    if (!selectedInvoice) return [];
    const items: Array<{
      productId: string;
      name: string;
      unit: string;
      quantity: number;
      price: number;
      gst: number;
      lineTotal: number;
    }> = [];

    for (const it of selectedInvoice.items || []) {
      const pid = it.productId || it.id;
      const qty = returnQuantities[pid] || 0;
      if (qty > 0) {
        const price = Number(it.price || it.sellingPrice || 0);
        const gst = Number(it.gst || it.tax || 0);
        const gross = price * qty;
        const tax = (gross * gst) / 100;
        items.push({
          productId: pid,
          name: it.name,
          unit: it.unit || 'unit',
          quantity: qty,
          price,
          gst,
          lineTotal: Math.round((gross + tax) * 100) / 100
        });
      }
    }
    return items;
  }, [selectedInvoice, returnQuantities]);

  const totalReturnCredit = React.useMemo(() => {
    return selectedReturnItems.reduce((acc, it) => acc + it.lineTotal, 0);
  }, [selectedReturnItems]);

  const handleProcessDirectReturn = async () => {
    if (selectedReturnItems.length === 0) {
      setError('Please select at least 1 item to return.');
      return;
    }

    setError(null);
    try {
      const invoiceId = selectedInvoice.invoiceNumber || selectedInvoice.id;
      const res = await returnMutation.mutateAsync({
        invoiceId,
        payload: {
          returnedItems: selectedReturnItems.map((it) => ({
            productId: it.productId,
            quantity: it.quantity
          })),
          refundMethod,
          reason: returnReason,
          notes: returnNotes
        }
      });

      if (res.success) {
        setSuccessMessage(`Return #${res.return.returnId} processed. Refund of ₹${res.return.refundAmount?.toFixed(2)} issued.`);
        setSelectedInvoice(null);
        setReturnQuantities({});
        setSearchResults([]);
        setSearchQuery('');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to process return transaction.');
    }
  };

  const handleStartExchange = () => {
    if (selectedReturnItems.length === 0) {
      setError('Please select at least 1 item to return for exchange.');
      return;
    }

    onInitiateExchange({
      originalInvoice: selectedInvoice,
      returnedItems: selectedReturnItems,
      returnCredit: totalReturnCredit
    });
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="POS Return & Exchange Studio"
      description="Lookup original customer sales by receipt number, mobile phone, or product barcode"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>

          {selectedInvoice && selectedReturnItems.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleStartExchange}
                leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
              >
                Exchange for Other Items
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={returnMutation.isPending}
                onClick={handleProcessDirectReturn}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Refund ₹{totalReturnCredit.toFixed(2)}
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by receipt # (INV-123), customer phone, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSearching}
            disabled={!searchQuery.trim()}
          >
            Search Sales
          </Button>
        </form>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* View 1: Search Results List */}
        {!selectedInvoice && searchResults.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Matching Transactions ({searchResults.length})
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {searchResults.map((inv) => (
                <div
                  key={inv.id || inv.invoiceNumber}
                  onClick={() => handleSelectInvoice(inv)}
                  className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-xs text-slate-900">#{inv.invoiceNumber}</span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(inv.createdAt || inv.date).toLocaleDateString('en-IN')}
                      </span>
                      {inv.returnStatus && (
                        <Badge variant="warning" size="sm">{inv.returnStatus}</Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2">
                      <span>{inv.customerName || 'Walk-in'}</span>
                      {inv.customerPhone && (
                        <span className="font-mono text-slate-500">({formatPhoneDisplay(inv.customerPhone)})</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-950">₹{inv.grandTotal?.toFixed(2)}</div>
                    <div className="text-[10px] text-blue-600 font-medium">Select to Return &rarr;</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View 2: Invoice Detail & Return Selector */}
        {selectedInvoice && (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Results</span>
                </button>
                <span className="text-slate-300">|</span>
                <span className="font-mono font-bold text-slate-900">#{selectedInvoice.invoiceNumber}</span>
              </div>
              <span className="font-semibold text-emerald-700">₹{selectedInvoice.grandTotal?.toFixed(2)}</span>
            </div>

            {/* Items Return Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 text-center">Sold</th>
                    <th className="p-2.5 text-center">Returned</th>
                    <th className="p-2.5 text-center">Returnable</th>
                    <th className="p-2.5 text-right w-24">Return Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedInvoice.items || []).map((it: any) => {
                    const pid = it.productId || it.id;
                    const soldQty = Number(it.soldQuantity ?? it.quantity ?? 1);
                    const returnedQty = Number(it.alreadyReturnedQuantity ?? 0);
                    const returnableQty = Math.max(0, soldQty - returnedQty);
                    const currentReturnQty = returnQuantities[pid] || 0;

                    return (
                      <tr key={pid} className="hover:bg-slate-50/50">
                        <td className="p-2.5">
                          <div className="font-medium text-slate-900">{it.name}</div>
                          <div className="text-[10px] text-slate-500">₹{Number(it.price || 0).toFixed(2)} / {it.unit || 'unit'}</div>
                        </td>
                        <td className="p-2.5 text-center text-slate-700">{soldQty}</td>
                        <td className="p-2.5 text-center text-amber-700 font-mono">{returnedQty}</td>
                        <td className="p-2.5 text-center">
                          <Badge variant={returnableQty > 0 ? 'success' : 'neutral'} size="sm">
                            {returnableQty}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            min="0"
                            max={returnableQty}
                            value={currentReturnQty}
                            disabled={returnableQty <= 0}
                            onChange={(e) =>
                              handleQuantityChange(pid, parseInt(e.target.value) || 0, returnableQty)
                            }
                            className="w-16 px-2 py-1 text-center bg-white border border-slate-200 rounded text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Refund Options */}
            {selectedReturnItems.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Total Return Credit</span>
                  <span className="text-sm font-bold text-emerald-700">₹{totalReturnCredit.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Refund Method">
                    <Select
                      options={[
                        { value: 'CASH', label: 'Cash Tender' },
                        { value: 'UPI', label: 'UPI / Bank Transfer' },
                        { value: 'CARD', label: 'Original Card' },
                        { value: 'STORE_CREDIT', label: 'Store Credit / Voucher' }
                      ]}
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Return Reason">
                    <Select
                      options={[
                        { value: 'Customer Request', label: 'Customer Request / Changed Mind' },
                        { value: 'Damaged / Defective', label: 'Damaged / Quality Issue' },
                        { value: 'Incorrect Item Sold', label: 'Incorrect Item Sold' },
                        { value: 'Expired Product', label: 'Expired / Near Expiry' }
                      ]}
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                    />
                  </FormField>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
