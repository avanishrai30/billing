'use client';

import React from 'react';
import { Truck, Package } from 'lucide-react';
import {
  Drawer,
  StatusBadge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead
} from '../../../components/ui';
import type { PurchaseDoc } from '../types';

export interface PurchaseDetailDrawerProps {
  purchase: PurchaseDoc | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PurchaseDetailDrawer({
  purchase,
  isOpen,
  onClose
}: PurchaseDetailDrawerProps) {
  if (!purchase) return null;

  const poNum = purchase.purchaseId || purchase.id;
  const items = Array.isArray(purchase.items) ? purchase.items : [];
  const transport = purchase.transport;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Inward Purchase Details — ${poNum}`}
      description="Authoritative procurement batch records, GST lines, and logistics details"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Top Summary Banner */}
        <div className="p-4 rounded-xl bg-[#032154] border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block">Supplier</span>
            <span className="font-semibold text-white mt-0.5 block">
              {purchase.supplierName || 'General Supplier'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Supplier Invoice #</span>
            <span className="font-mono text-white mt-0.5 block">
              {purchase.invoiceNumber || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Store Location</span>
            <span className="font-mono text-slate-200 mt-0.5 block">
              {purchase.locationId || purchase.storeId || 'All'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Status / Void</span>
            <div className="mt-0.5">
              <StatusBadge status={purchase.status || 'RECEIVED'} />
            </div>
          </div>
        </div>

        {/* Line Items Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Package className="w-3.5 h-3.5 text-sky-400" />
            <span>Procurement Line Items ({items.length})</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <Table density="dense">
              <TableHeader>
                <tr>
                  <TableHead>SKU / Item</TableHead>
                  <TableHead isNumeric>Qty</TableHead>
                  <TableHead isNumeric>Rate (₹)</TableHead>
                  <TableHead style={{ width: '10%' }}>GST</TableHead>
                  <TableHead isNumeric>Tax (₹)</TableHead>
                  <TableHead isNumeric>Total (₹)</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {items.map((item: any, idx: number) => {
                  const qty = Number(item.quantity) || 1;
                  const rate = Number(item.cost || item.purchasePrice || item.rate || 0);
                  const gst = Number(item.gstRate || 0);
                  const tax = Number(item.taxAmount || 0);
                  const lineTotal = Number(item.lineTotal || (qty * rate));

                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="font-semibold text-white text-xs">{item.name}</div>
                        {item.sku && (
                          <div className="font-mono text-[10px] text-slate-400">{item.sku}</div>
                        )}
                      </TableCell>
                      <TableCell isNumeric className="font-mono text-slate-200 text-xs">
                        {qty} {item.unit || 'unit'}
                      </TableCell>
                      <TableCell isNumeric className="font-mono text-slate-200 text-xs">
                        ₹ {rate.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-slate-400 text-xs">
                        {gst}%
                      </TableCell>
                      <TableCell isNumeric className="font-mono text-slate-300 text-xs">
                        ₹ {tax.toFixed(2)}
                      </TableCell>
                      <TableCell isNumeric className="font-mono font-bold text-white text-xs">
                        ₹ {lineTotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Transport Breakdown (if enabled) */}
        {transport && transport.enabled && (
          <div className="p-4 rounded-xl bg-[#032154] border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Truck className="w-3.5 h-3.5 text-sky-400" />
              <span>Inward Transport & Freight Details</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
              <div>
                <span className="text-slate-400 block">Transporter</span>
                <span className="font-medium text-white">{transport.transporter || 'Direct'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Docket / LR #</span>
                <span className="font-mono text-white">{transport.docketNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Freight Charge</span>
                <span className="font-mono text-white">₹ {Number(transport.charge || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Freight Tax ({transport.taxRate || 0}%)</span>
                <span className="font-mono text-white">₹ {Number(transport.taxAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Totals Summary */}
        <div className="p-4 rounded-xl bg-[#021b47] border border-white/10 space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Items Subtotal</span>
            <span className="font-mono tabular-nums text-slate-200">
              ₹ {Number(purchase.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>GST Amount</span>
            <span className="font-mono tabular-nums text-slate-200">
              + ₹ {Number(purchase.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {Number(purchase.shipping || 0) > 0 && (
            <div className="flex justify-between text-xs text-sky-400">
              <span>Freight / Shipping</span>
              <span className="font-mono tabular-nums">
                + ₹ {Number(purchase.shipping || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <div className="pt-2 border-t border-white/10 flex justify-between items-center">
            <span className="font-semibold text-white text-xs uppercase tracking-wider">Grand Total</span>
            <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
              ₹ {Number(purchase.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Audit Metadata */}
        <div className="pt-2 text-[11px] text-slate-400 font-mono flex justify-between">
          <span>Created By: {purchase.createdBy || 'System'}</span>
          <span>Date: {new Date(purchase.createdAt).toLocaleString()}</span>
        </div>
      </div>
    </Drawer>
  );
}
