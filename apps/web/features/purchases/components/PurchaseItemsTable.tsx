'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Card,
  SectionHeader,
  Button,
  IconButton,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead
} from '../../../components/ui';
import { calculatePurchaseLine } from '../calculations';
import type { PurchaseItem } from '../types';

export interface PurchaseItemsTableProps {
  items: PurchaseItem[];
  onChange: (items: PurchaseItem[]) => void;
  availableProducts?: Array<{ id: string; name: string; sku?: string; cost?: number; price?: number; unit?: string }>;
}

export function PurchaseItemsTable({
  items,
  onChange,
  availableProducts = []
}: PurchaseItemsTableProps) {
  const handleAddItem = () => {
    const newItem: PurchaseItem = {
      name: '',
      sku: '',
      barcode: '',
      hsn: '',
      quantity: 1,
      unit: 'unit',
      cost: 0,
      discountPercent: 0,
      discountAmount: 0,
      gstRate: 0,
      taxableValue: 0,
      taxAmount: 0,
      lineTotal: 0
    };
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    const next = items.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleUpdateItem = (index: number, patch: Partial<PurchaseItem>) => {
    const updatedList = items.map((item, i) => {
      if (i !== index) return item;
      const merged = { ...item, ...patch };
      const calculated = calculatePurchaseLine(merged);
      return {
        ...merged,
        ...calculated
      };
    });
    onChange(updatedList);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const found = availableProducts.find((p) => p.id === productId);
    if (!found) return;

    handleUpdateItem(index, {
      productId: found.id,
      name: found.name,
      sku: found.sku || '',
      cost: found.cost || 0,
      unit: found.unit || 'unit'
    });
  };

  return (
    <Card variant="default">
      <SectionHeader
        title="Procurement Line Items"
        subtitle="Catalog inventory entries and incoming batch valuation"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddItem}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Line Item
          </Button>
        }
      />

      <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
        <Table density="dense" className="min-w-[900px]">
          <TableHeader>
            <tr>
              <TableHead style={{ width: '28%' }}>Item Description / SKU</TableHead>
              <TableHead style={{ width: '10%' }}>HSN</TableHead>
              <TableHead isNumeric style={{ width: '10%' }}>Qty</TableHead>
              <TableHead style={{ width: '10%' }}>Unit</TableHead>
              <TableHead isNumeric style={{ width: '12%' }}>Unit Rate (₹)</TableHead>
              <TableHead isNumeric style={{ width: '8%' }}>Disc %</TableHead>
              <TableHead style={{ width: '8%' }}>GST %</TableHead>
              <TableHead isNumeric style={{ width: '10%' }}>Tax (₹)</TableHead>
              <TableHead isNumeric style={{ width: '12%' }}>Total (₹)</TableHead>
              <TableHead align="center" style={{ width: '4%' }}></TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={idx}>
                {/* Product Name & SKU */}
                <TableCell>
                  <div className="space-y-1.5 py-1">
                    <Input
                      placeholder="e.g. Pure Cow Ghee 1L"
                      value={item.name}
                      onChange={(e) => handleUpdateItem(idx, { name: e.target.value })}
                    />
                    <div className="flex items-center gap-1.5">
                      <Input
                        placeholder="SKU code"
                        className="text-[11px] font-mono h-7"
                        value={item.sku || ''}
                        onChange={(e) => handleUpdateItem(idx, { sku: e.target.value })}
                      />
                      {availableProducts.length > 0 && (
                        <Select
                          placeholder="Quick Pick"
                          className="text-[11px] h-7"
                          options={availableProducts.map((p) => ({
                            value: p.id,
                            label: `${p.name} (${p.sku || 'No SKU'})`
                          }))}
                          value={item.productId || ''}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* HSN */}
                <TableCell>
                  <Input
                    placeholder="0405"
                    className="font-mono text-xs"
                    value={item.hsn || ''}
                    onChange={(e) => handleUpdateItem(idx, { hsn: e.target.value })}
                  />
                </TableCell>

                {/* Quantity */}
                <TableCell isNumeric>
                  <Input
                    type="number"
                    min="1"
                    step="any"
                    isNumeric
                    value={item.quantity}
                    onChange={(e) =>
                      handleUpdateItem(idx, { quantity: parseFloat(e.target.value) || 0 })
                    }
                  />
                </TableCell>

                {/* Unit */}
                <TableCell>
                  <Select
                    options={[
                      { value: 'unit', label: 'Unit' },
                      { value: 'packet', label: 'Packet' },
                      { value: 'kg', label: 'kg' },
                      { value: 'liter', label: 'Liter' },
                      { value: 'piece', label: 'Piece' },
                      { value: 'box', label: 'Box' },
                      { value: 'tin', label: 'Tin' },
                      { value: 'jar', label: 'Jar' }
                    ]}
                    value={item.unit}
                    onChange={(e) => handleUpdateItem(idx, { unit: e.target.value })}
                  />
                </TableCell>

                {/* Rate */}
                <TableCell isNumeric>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    isNumeric
                    value={item.cost}
                    onChange={(e) =>
                      handleUpdateItem(idx, { cost: parseFloat(e.target.value) || 0 })
                    }
                  />
                </TableCell>

                {/* Discount % */}
                <TableCell isNumeric>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    isNumeric
                    value={item.discountPercent || 0}
                    onChange={(e) =>
                      handleUpdateItem(idx, { discountPercent: parseFloat(e.target.value) || 0 })
                    }
                  />
                </TableCell>

                {/* GST Rate */}
                <TableCell>
                  <Select
                    options={[
                      { value: '0', label: '0%' },
                      { value: '5', label: '5%' },
                      { value: '12', label: '12%' },
                      { value: '18', label: '18%' },
                      { value: '28', label: '28%' }
                    ]}
                    value={String(item.gstRate ?? 0)}
                    onChange={(e) => handleUpdateItem(idx, { gstRate: parseFloat(e.target.value) || 0 })}
                  />
                </TableCell>

                {/* Tax Amount */}
                <TableCell isNumeric className="font-mono text-slate-300 text-xs tabular-nums">
                  ₹ {item.taxAmount.toFixed(2)}
                </TableCell>

                {/* Line Total */}
                <TableCell isNumeric className="font-mono font-bold text-white text-xs tabular-nums">
                  ₹ {item.lineTotal.toFixed(2)}
                </TableCell>

                {/* Delete Row */}
                <TableCell align="center">
                  <IconButton
                    aria-label={`Remove row ${idx + 1}`}
                    variant="ghost"
                    size="sm"
                    disabled={items.length <= 1}
                    onClick={() => handleRemoveItem(idx)}
                    icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
