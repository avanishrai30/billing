'use client';

import React from 'react';
import { Card, SectionHeader, FormField, Input, Select } from '../../../components/ui';

export interface PurchaseHeaderProps {
  supplierName: string;
  onSupplierChange: (name: string, id?: string) => void;
  invoiceNumber: string;
  onInvoiceNumberChange: (val: string) => void;
  purchaseDate: string;
  onPurchaseDateChange: (val: string) => void;
  locationId: string;
  onLocationChange: (val: string) => void;
  reference: string;
  onReferenceChange: (val: string) => void;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  onPaymentStatusChange: (val: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID') => void;
  notes: string;
  onNotesChange: (val: string) => void;
  suppliers: Array<{ id: string; name: string }>;
  stores: Array<{ id: string; name: string }>;
  disabledStore?: boolean;
}

export function PurchaseHeader({
  supplierName,
  onSupplierChange,
  invoiceNumber,
  onInvoiceNumberChange,
  purchaseDate,
  onPurchaseDateChange,
  locationId,
  onLocationChange,
  reference,
  onReferenceChange,
  paymentStatus,
  onPaymentStatusChange,
  notes,
  onNotesChange,
  suppliers = [],
  stores = [],
  disabledStore = false
}: PurchaseHeaderProps) {
  const storeOptions = stores.map((st) => ({ value: st.id, label: st.name }));

  return (
    <Card variant="default">
      <SectionHeader
        title="Procurement Batch & Inward Header"
        subtitle="Specify vendor billing reference, receiving outlet, and payment parameters"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {/* Supplier Name */}
        <FormField label="Supplier / Vendor" required helperText="Select known vendor or type name">
          <Input
            placeholder="e.g. Baramati Dairy Cooperative"
            value={supplierName}
            onChange={(e) => onSupplierChange(e.target.value)}
          />
        </FormField>

        {/* Supplier Invoice / Bill Number */}
        <FormField label="Supplier Invoice / Bill #" required helperText="Vendor's physical bill number">
          <Input
            placeholder="e.g. BILL-98214"
            value={invoiceNumber}
            onChange={(e) => onInvoiceNumberChange(e.target.value)}
          />
        </FormField>

        {/* Purchase Date */}
        <FormField label="Inward / Invoice Date" required>
          <Input
            type="date"
            value={purchaseDate}
            onChange={(e) => onPurchaseDateChange(e.target.value)}
          />
        </FormField>

        {/* Receiving Store Location */}
        <FormField label="Receiving Outlet / Store" required>
          <Select
            placeholder="Select receiving location"
            options={storeOptions}
            value={locationId}
            disabled={disabledStore}
            onChange={(e) => onLocationChange(e.target.value)}
          />
        </FormField>

        {/* Payment Status */}
        <FormField label="Settlement / Payment Status">
          <Select
            options={[
              { value: 'PAID', label: 'Full Settlement (PAID)' },
              { value: 'PARTIALLY_PAID', label: 'Partial Payment' },
              { value: 'UNPAID', label: 'Credit / Accounts Payable (UNPAID)' }
            ]}
            value={paymentStatus}
            onChange={(e) => onPaymentStatusChange(e.target.value as any)}
          />
        </FormField>

        {/* Purchase Order / Reference */}
        <FormField label="PO Reference / Tracking Tag">
          <Input
            placeholder="e.g. PO-REQ-2026"
            value={reference}
            onChange={(e) => onReferenceChange(e.target.value)}
          />
        </FormField>
      </div>

      {/* Optional Inward Notes */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <FormField label="Procurement Notes & Batch Remarks">
          <Input
            placeholder="Additional gate-in remarks, temperature logs, quality audit remarks..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </FormField>
      </div>
    </Card>
  );
}
