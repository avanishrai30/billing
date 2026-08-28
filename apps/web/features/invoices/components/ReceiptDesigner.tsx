'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Save, ReceiptText, Printer, Barcode, AlignCenter, Type } from 'lucide-react';
import { Button, Checkbox, FormField, Input, Select, Switch, Badge } from '../../../components/ui';
import {
  DEFAULT_RECEIPT_TEMPLATE,
  RECEIPT_TEMPLATE_PRESETS,
  formatReceiptHtml,
  generateCanonicalReceipt,
  loadReceiptTemplate,
  mergeReceiptTemplate,
  saveReceiptTemplate
} from '../../../lib/utils/receiptDocument';
import type { ReceiptTemplate } from '../../pos/types';

const sampleInvoice = {
  invoiceNumber: 'INV-1787903845787',
  transactionId: 'TXN-1787903845787',
  createdAt: '2026-08-28T10:42:00+05:30',
  createdBy: 'Rajesh',
  paymentMode: 'CASH',
  amountPaid: 1200,
  subtotal: 1200,
  discount: 100,
  tax: 20,
  grandTotal: 1120,
  items: [
    { productId: 'prod-ghee', name: 'A2 Cow Ghee', sku: 'GHEE-1L', quantity: 1, price: 1023, lineTotal: 1023, tax: 10 },
    { productId: 'prod-honey', name: 'Wild Forest Honey', sku: 'HONEY-500', quantity: 1, price: 177, lineTotal: 177, tax: 10 }
  ]
};

const sampleStore = {
  name: "VC ORGANIC'S SRS",
  address: 'SRS Outlet, Bengaluru',
  phone: '9876543210',
  gstin: '29AAAAA0000A1Z5'
};

function updateTemplate(
  template: ReceiptTemplate,
  patch: (draft: ReceiptTemplate) => void
): ReceiptTemplate {
  const next = mergeReceiptTemplate(JSON.parse(JSON.stringify(template)));
  patch(next);
  return next;
}

export function ReceiptDesigner() {
  const [template, setTemplate] = useState<ReceiptTemplate>(DEFAULT_RECEIPT_TEMPLATE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTemplate(loadReceiptTemplate());
  }, []);

  const previewReceipt = useMemo(
    () => generateCanonicalReceipt(sampleInvoice, sampleStore, { name: 'VC ORGANIC' }),
    []
  );

  const previewHtml = useMemo(
    () => formatReceiptHtml(previewReceipt, template.paperWidthMm, template),
    [previewReceipt, template]
  );

  const handlePresetChange = (presetId: string) => {
    const preset = RECEIPT_TEMPLATE_PRESETS.find(item => item.id === presetId);
    if (preset) {
      setTemplate(mergeReceiptTemplate(preset));
      setSaved(false);
    }
  };

  const handleSave = () => {
    setTemplate(saveReceiptTemplate(template));
    setSaved(true);
  };

  const handleReset = () => {
    const next = saveReceiptTemplate(DEFAULT_RECEIPT_TEMPLATE);
    setTemplate(next);
    setSaved(true);
  };

  return (
    <section
      data-testid="receipt-designer"
      className="border border-slate-200 bg-white rounded-lg shadow-xs overflow-hidden"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <ReceiptText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-950">Receipt Designer</h2>
            <p className="text-xs text-slate-500">
              Template-only controls for deterministic 58mm and 80mm thermal receipts.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saved && <Badge variant="success" size="sm">Saved default</Badge>}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Reset Preset
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            leftIcon={<Save className="h-3.5 w-3.5" />}
          >
            Save Default
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_280px] min-h-[520px]">
        <div className="border-b border-slate-200 p-4 space-y-4 xl:border-b-0 xl:border-r">
          <FormField label="Preset">
            <Select
              value={template.id}
              onChange={(event) => handlePresetChange(event.target.value)}
              options={RECEIPT_TEMPLATE_PRESETS.map(item => ({ value: item.id, label: item.name }))}
            />
          </FormField>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Printer className="h-3.5 w-3.5 text-emerald-700" />
              <span>Paper</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[58, 80].map(width => (
                <button
                  key={width}
                  type="button"
                  onClick={() => setTemplate(updateTemplate(template, draft => { draft.paperWidthMm = width as 58 | 80; }))}
                  className={`h-9 rounded-lg border text-xs font-semibold transition-colors ${
                    template.paperWidthMm === width
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {width} mm
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-900">Header</div>
            <Checkbox label="Show logo" checked={template.header.showLogo} onChange={(e) => setTemplate(updateTemplate(template, d => { d.header.showLogo = e.target.checked; }))} />
            <Checkbox label="Business name" checked={template.header.showBusinessName} onChange={(e) => setTemplate(updateTemplate(template, d => { d.header.showBusinessName = e.target.checked; }))} />
            <Checkbox label="Store name" checked={template.header.showStoreName} onChange={(e) => setTemplate(updateTemplate(template, d => { d.header.showStoreName = e.target.checked; }))} />
            <Checkbox label="Address" checked={template.header.showAddress} onChange={(e) => setTemplate(updateTemplate(template, d => { d.header.showAddress = e.target.checked; }))} />
            <Checkbox label="Contact" checked={template.header.showContact} onChange={(e) => setTemplate(updateTemplate(template, d => { d.header.showContact = e.target.checked; }))} />
            <Checkbox label="GSTIN" checked={template.header.showGstin} onChange={(e) => setTemplate(updateTemplate(template, d => { d.header.showGstin = e.target.checked; }))} />
            <Checkbox label="Cashier" checked={template.header.showCashier} onChange={(e) => setTemplate(updateTemplate(template, d => { d.header.showCashier = e.target.checked; }))} />
            <Checkbox label="Date / time" checked={template.header.showDateTime} onChange={(e) => setTemplate(updateTemplate(template, d => { d.header.showDateTime = e.target.checked; }))} />
            <Switch
              label="Auto print after sale"
              checked={template.behavior.autoPrintAfterSale}
              onChange={(e) => setTemplate(updateTemplate(template, d => { d.behavior.autoPrintAfterSale = e.target.checked; }))}
              className="[&_span]:!text-slate-800"
            />
          </div>
        </div>

        <div className="bg-slate-100/80 p-4 md:p-6 flex flex-col min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-950">Live Thermal Preview</h3>
              <p className="text-[11px] text-slate-500">Sample data only. Saved templates never duplicate product or customer records.</p>
            </div>
            <Badge variant="info" size="sm">{template.paperWidthMm}mm</Badge>
          </div>
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-200 bg-white/70 p-4">
            <div
              className="mx-auto bg-white shadow-sm border border-slate-300"
              style={{ width: `${Math.min(template.paperWidthMm * 4, 360)}px` }}
            >
              <iframe
                title="Receipt preview"
                data-testid="receipt-preview-frame"
                className="block w-full h-[620px] bg-white"
                srcDoc={previewHtml}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 p-4 space-y-4 xl:border-l xl:border-t-0">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Barcode className="h-3.5 w-3.5 text-emerald-700" />
              <span>Transaction</span>
            </div>
            <Checkbox label="Invoice number" checked={template.transaction.showInvoiceNumber} onChange={(e) => setTemplate(updateTemplate(template, d => { d.transaction.showInvoiceNumber = e.target.checked; }))} />
            <Checkbox label="Invoice barcode" checked={template.transaction.showInvoiceBarcode} onChange={(e) => setTemplate(updateTemplate(template, d => { d.transaction.showInvoiceBarcode = e.target.checked; }))} />
            <FormField label="Barcode type">
              <Select
                value={template.transaction.barcodeType}
                onChange={(event) => setTemplate(updateTemplate(template, d => { d.transaction.barcodeType = event.target.value as ReceiptTemplate['transaction']['barcodeType']; }))}
                options={[
                  { value: 'CODE128', label: 'Code 128' },
                  { value: 'QR', label: 'QR', disabled: true }
                ]}
              />
            </FormField>
            <Checkbox label="Item SKU" checked={template.transaction.showItemSku} onChange={(e) => setTemplate(updateTemplate(template, d => { d.transaction.showItemSku = e.target.checked; }))} />
            <Checkbox label="Quantity" checked={template.transaction.showQuantity} onChange={(e) => setTemplate(updateTemplate(template, d => { d.transaction.showQuantity = e.target.checked; }))} />
            <Checkbox label="Rate" checked={template.transaction.showRate} onChange={(e) => setTemplate(updateTemplate(template, d => { d.transaction.showRate = e.target.checked; }))} />
            <Checkbox label="Discount row" checked={template.transaction.showDiscount} onChange={(e) => setTemplate(updateTemplate(template, d => { d.transaction.showDiscount = e.target.checked; }))} />
            <Checkbox label="Tax rows" checked={template.transaction.showTax} onChange={(e) => setTemplate(updateTemplate(template, d => { d.transaction.showTax = e.target.checked; }))} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <AlignCenter className="h-3.5 w-3.5 text-emerald-700" />
              <span>Style</span>
            </div>
            <FormField label="Alignment">
              <Select
                value={template.style.alignment}
                onChange={(event) => setTemplate(updateTemplate(template, d => { d.style.alignment = event.target.value as ReceiptTemplate['style']['alignment']; }))}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'center', label: 'Center' },
                  { value: 'right', label: 'Right' }
                ]}
              />
            </FormField>
            <FormField label="Item density">
              <Select
                value={template.style.density}
                onChange={(event) => setTemplate(updateTemplate(template, d => { d.style.density = event.target.value as ReceiptTemplate['style']['density']; }))}
                options={[
                  { value: 'compact', label: 'Compact' },
                  { value: 'standard', label: 'Standard' },
                  { value: 'spacious', label: 'Spacious' }
                ]}
              />
            </FormField>
            <FormField label="Logo size">
              <Select
                value={template.style.logoSize}
                onChange={(event) => setTemplate(updateTemplate(template, d => { d.style.logoSize = event.target.value as ReceiptTemplate['style']['logoSize']; }))}
                options={[
                  { value: 'sm', label: 'Small' },
                  { value: 'md', label: 'Medium' },
                  { value: 'lg', label: 'Large' }
                ]}
              />
            </FormField>
            <FormField label="Brand scale">
              <Input
                type="range"
                min="0.8"
                max="1.2"
                step="0.05"
                value={template.style.businessNameScale}
                onChange={(event) => setTemplate(updateTemplate(template, d => { d.style.businessNameScale = Number(event.target.value); }))}
              />
            </FormField>
            <Checkbox
              label="Bold business name"
              checked={template.style.businessNameBold}
              onChange={(event) => setTemplate(updateTemplate(template, d => { d.style.businessNameBold = event.target.checked; }))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Type className="h-3.5 w-3.5 text-emerald-700" />
              <span>Footer</span>
            </div>
            <textarea
              value={template.footer.text}
              onChange={(event) => setTemplate(updateTemplate(template, d => { d.footer.text = event.target.value; }))}
              className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
