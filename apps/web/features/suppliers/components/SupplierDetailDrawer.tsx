'use client';

import React from 'react';
import { Truck, Phone, Mail, FileCheck, MapPin, Package, Edit, ShoppingCart } from 'lucide-react';
import { Drawer, Button, Badge, Skeleton, EmptyState } from '../../../components/ui';
import { usePurchasesQuery } from '../../purchases/hooks';
import { formatSupplierContact, formatSupplierGst } from '../calculations';
import type { SupplierDoc } from '../types';

export interface SupplierDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierDoc | null;
  canEdit?: boolean;
  onOpenEdit: (supplier: SupplierDoc) => void;
}

export function SupplierDetailDrawer({
  isOpen,
  onClose,
  supplier,
  canEdit = false,
  onOpenEdit
}: SupplierDetailDrawerProps) {
  const { data: purchasesRes, isLoading: isLoadingPurchases } = usePurchasesQuery({
    supplierId: supplier?.id,
    limit: 50
  });

  if (!supplier) return null;

  const purchases = purchasesRes?.purchases || [];
  const formattedContact = formatSupplierContact(supplier.contact);
  const gstDisplay = formatSupplierGst(supplier.gst || supplier.gstin);

  // Compute supplier procurement statistics from purchases
  const activePurchases = purchases.filter((p) => p.status !== 'VOIDED' && !p.isArchived);
  const totalProcurementSpend = activePurchases.reduce(
    (sum, p) => sum + Number(p.grandTotal ?? 0),
    0
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={supplier.name}
      description={`Supply Partner ID #${supplier.id}`}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Profile Card & Action Banner */}
        <div className="p-4 rounded-2xl bg-[#0f172a] border border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">{supplier.name}</h2>
              {gstDisplay !== 'Unregistered' && (
                <Badge variant="warning" size="sm">
                  GST Verified
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-slate-300">
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                {formattedContact}
              </span>
              {supplier.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-sky-400" />
                  {supplier.email}
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
                onOpenEdit(supplier);
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
              Registered: {supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Warehouse / Dispatch Location</span>
            </div>
            <div className="text-slate-300 text-[11px] leading-relaxed">
              {supplier.address || 'No dispatch address specified on profile'}
            </div>
          </div>
        </div>

        {/* Lifetime Procurement Statistics Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-[#0f172a] border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Total Orders</span>
              <ShoppingCart className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-lg font-mono font-bold text-white tabular-nums">
              {activePurchases.length} Inward Bills
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0f172a] border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Procurement Volume</span>
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums">
              ₹ {totalProcurementSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Supplier Procurement History Ledger */}
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0f172a]">
          <div className="p-3 bg-[#0f172a] border-b border-white/10 font-bold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Inward Purchase Ledger ({purchases.length})</span>
            </div>
          </div>

          {isLoadingPurchases ? (
            <div className="p-4 space-y-2">
              <Skeleton variant="text" className="w-full h-4" />
              <Skeleton variant="text" className="w-3/4 h-4" />
            </div>
          ) : purchases.length === 0 ? (
            <EmptyState
              icon={<Package className="w-6 h-6 text-slate-400" />}
              title="No Inward Purchases Recorded"
              description="Zero procurement stock batch entries have been registered with this supplier."
            />
          ) : (
            <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
              {purchases.map((p) => {
                const isVoided = p.status === 'VOIDED' || p.isArchived;
                const grandTotal = Number(p.grandTotal ?? 0);
                const pDate = p.createdAt
                  ? new Date(p.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })
                  : 'N/A';

                return (
                  <div
                    key={p.id || p._id || p.invoiceNumber}
                    className={`p-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] ${
                      isVoided ? 'opacity-50 bg-rose-500/[0.02]' : ''
                    }`}
                  >
                    <div>
                      <div className="font-mono font-bold text-white text-xs">
                        {p.invoiceNumber || p.id}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {pDate} • {p.items?.length || 0} items • {p.locationId || p.storeId || 'Store'}
                      </div>
                      {p.transport?.docketNumber && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          LR: {p.transport.docketNumber} ({p.transport.transporter || 'Direct'})
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-white text-xs tabular-nums">
                        ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <Badge variant={isVoided ? 'danger' : 'success'} size="sm">
                        {isVoided ? 'VOIDED' : p.status || 'COMPLETED'}
                      </Badge>
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
