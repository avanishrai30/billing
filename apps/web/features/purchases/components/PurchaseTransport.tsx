'use client';

import React from 'react';
import { Truck } from 'lucide-react';
import { Card, SectionHeader, Switch, FormField, Input, Select } from '../../../components/ui';
import type { PurchaseTransport } from '../types';

export interface PurchaseTransportProps {
  transport: PurchaseTransport;
  onChange: (transport: PurchaseTransport) => void;
}

export function PurchaseTransportSection({ transport, onChange }: PurchaseTransportProps) {
  const handleToggle = (checked: boolean) => {
    onChange({
      ...transport,
      enabled: checked
    });
  };

  const handleUpdate = (patch: Partial<PurchaseTransport>) => {
    const next = { ...transport, ...patch };
    const charge = Math.max(0, Number(next.charge) || 0);
    const taxRate = Math.max(0, Number(next.taxRate) || 0);
    const taxAmount = Math.round((charge * (taxRate / 100)) * 100) / 100;

    onChange({
      ...next,
      charge,
      taxRate,
      taxAmount
    });
  };

  return (
    <Card variant="default">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="Transport, Logistics & Inward Freight"
          subtitle="Record optional freight charges, docket references, and transport GST"
        />
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-sky-400" />
          <Switch
            label="Enable Transport"
            checked={transport.enabled}
            onChange={(e) => handleToggle(e.target.checked)}
          />
        </div>
      </div>

      {transport.enabled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/5 mt-4">
          {/* Transporter */}
          <FormField label="Transporter / Carrier">
            <Input
              placeholder="e.g. VRL Logistics"
              value={transport.transporter || ''}
              onChange={(e) => handleUpdate({ transporter: e.target.value })}
            />
          </FormField>

          {/* Mode */}
          <FormField label="Transport Mode">
            <Select
              options={[
                { value: 'ROAD', label: 'Road Transport' },
                { value: 'RAIL', label: 'Rail Cargo' },
                { value: 'AIR', label: 'Air Express' },
                { value: 'COURIER', label: 'Courier Parcel' }
              ]}
              value={transport.mode || 'ROAD'}
              onChange={(e) => handleUpdate({ mode: e.target.value })}
            />
          </FormField>

          {/* Docket Number */}
          <FormField label="LR / Docket / Bilty #">
            <Input
              placeholder="e.g. LR-781920"
              value={transport.docketNumber || ''}
              onChange={(e) => handleUpdate({ docketNumber: e.target.value })}
            />
          </FormField>

          {/* Transport Date */}
          <FormField label="Dispatch / Inward Date">
            <Input
              type="date"
              value={transport.transportDate || ''}
              onChange={(e) => handleUpdate({ transportDate: e.target.value })}
            />
          </FormField>

          {/* Freight Charge */}
          <FormField label="Freight Charge (₹)" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              isNumeric
              value={transport.charge || 0}
              onChange={(e) => handleUpdate({ charge: parseFloat(e.target.value) || 0 })}
            />
          </FormField>

          {/* GST on Freight */}
          <FormField label="Freight GST %">
            <Select
              options={[
                { value: '0', label: '0% (Exempt)' },
                { value: '5', label: '5% (GTA Normal)' },
                { value: '12', label: '12% (Forward Charge)' },
                { value: '18', label: '18% (Courier/Express)' }
              ]}
              value={String(transport.taxRate ?? 5)}
              onChange={(e) => handleUpdate({ taxRate: parseFloat(e.target.value) || 0 })}
            />
          </FormField>

          {/* Freight Tax Amount */}
          <FormField label="Freight Tax (₹)">
            <Input
              type="number"
              isNumeric
              disabled
              value={transport.taxAmount || 0}
            />
          </FormField>

          {/* Transport Payment Status */}
          <FormField label="Freight Payment Terms">
            <Select
              options={[
                { value: 'PAID', label: 'Freight Paid by Vendor' },
                { value: 'TO_PAY', label: 'To Pay (Recipient Payable)' },
                { value: 'BILLED', label: 'Added to Vendor Invoice' }
              ]}
              value={transport.paymentStatus || 'TO_PAY'}
              onChange={(e) => handleUpdate({ paymentStatus: e.target.value })}
            />
          </FormField>
        </div>
      )}
    </Card>
  );
}
