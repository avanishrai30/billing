import type { POSReceiptData, POSReceiptOptions, ReceiptTemplate } from '../../features/pos/types';
import { generateBarcodeSvg } from './barcode';

export const DEFAULT_RECEIPT_TEMPLATE: ReceiptTemplate = {
  id: 'vc-organic-signature',
  name: 'VC Organic Signature',
  preset: 'vc-organic-signature',
  paperWidthMm: 80,
  header: {
    showLogo: true,
    showBusinessName: true,
    showStoreName: true,
    showAddress: false,
    showGstin: false,
    showContact: false,
    showCashier: true,
    showDateTime: true
  },
  transaction: {
    showInvoiceNumber: true,
    showInvoiceBarcode: true,
    barcodeType: 'CODE128',
    showItemSku: false,
    showQuantity: true,
    showRate: true,
    showDiscount: true,
    showTax: true
  },
  footer: {
    text: 'Thank you for shopping with us. Returns/exchange require original invoice.'
  },
  style: {
    alignment: 'center',
    density: 'standard',
    logoSize: 'md',
    businessNameBold: true,
    businessNameScale: 1
  },
  behavior: {
    autoPrintAfterSale: true
  }
};

export const CLASSIC_RECEIPT_TEMPLATE: ReceiptTemplate = {
  ...DEFAULT_RECEIPT_TEMPLATE,
  id: 'classic-thermal',
  name: 'Classic Thermal',
  preset: 'classic',
  header: {
    ...DEFAULT_RECEIPT_TEMPLATE.header,
    showLogo: false,
    showAddress: true,
    showGstin: true,
    showContact: true
  },
  style: {
    ...DEFAULT_RECEIPT_TEMPLATE.style,
    alignment: 'center',
    density: 'compact',
    businessNameScale: 0.92
  }
};

export const COMPACT_RECEIPT_TEMPLATE: ReceiptTemplate = {
  ...DEFAULT_RECEIPT_TEMPLATE,
  id: 'compact-pos',
  name: 'Compact POS',
  preset: 'compact',
  paperWidthMm: 58,
  header: {
    ...DEFAULT_RECEIPT_TEMPLATE.header,
    showLogo: false,
    showAddress: false,
    showGstin: false,
    showContact: false
  },
  transaction: {
    ...DEFAULT_RECEIPT_TEMPLATE.transaction,
    showItemSku: false
  },
  style: {
    ...DEFAULT_RECEIPT_TEMPLATE.style,
    density: 'compact',
    logoSize: 'sm',
    businessNameScale: 0.86
  }
};

export const RECEIPT_TEMPLATE_PRESETS = [
  DEFAULT_RECEIPT_TEMPLATE,
  CLASSIC_RECEIPT_TEMPLATE,
  COMPACT_RECEIPT_TEMPLATE
];

export const RECEIPT_TEMPLATE_STORAGE_KEY = 'vc-organic-receipt-template';

export function mergeReceiptTemplate(template?: Partial<ReceiptTemplate> | null): ReceiptTemplate {
  if (!template) return DEFAULT_RECEIPT_TEMPLATE;
  return {
    ...DEFAULT_RECEIPT_TEMPLATE,
    ...template,
    header: { ...DEFAULT_RECEIPT_TEMPLATE.header, ...(template.header || {}) },
    transaction: { ...DEFAULT_RECEIPT_TEMPLATE.transaction, ...(template.transaction || {}) },
    footer: { ...DEFAULT_RECEIPT_TEMPLATE.footer, ...(template.footer || {}) },
    style: { ...DEFAULT_RECEIPT_TEMPLATE.style, ...(template.style || {}) },
    behavior: { ...DEFAULT_RECEIPT_TEMPLATE.behavior, ...(template.behavior || {}) }
  };
}

export function loadReceiptTemplate(): ReceiptTemplate {
  if (typeof window === 'undefined') return DEFAULT_RECEIPT_TEMPLATE;
  try {
    const raw = window.localStorage.getItem(RECEIPT_TEMPLATE_STORAGE_KEY);
    return mergeReceiptTemplate(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_RECEIPT_TEMPLATE;
  }
}

export function saveReceiptTemplate(template: ReceiptTemplate): ReceiptTemplate {
  const next = mergeReceiptTemplate(template);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(RECEIPT_TEMPLATE_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

/**
 * Builds canonical POS Receipt data structure from immutable invoice snapshot.
 */
export function generateCanonicalReceipt(
  invoice: any,
  store?: { name?: string; address?: string; phone?: string; gstin?: string } | null,
  business?: { name?: string; logo?: string; address?: string; phone?: string; gstin?: string; terms?: string } | null,
  options?: POSReceiptOptions
): POSReceiptData {
  const snapshot = invoice?.receiptSnapshot || {};
  const businessName = snapshot.businessName || business?.name || store?.name || 'VC ORGANIC';
  const storeName = snapshot.storeName || store?.name || business?.name || 'Main Outlet';
  const storeAddress = snapshot.storeAddress || store?.address || business?.address || '';
  const storePhone = snapshot.storePhone || store?.phone || business?.phone || '';
  const storeGstin = snapshot.storeGstin || store?.gstin || business?.gstin || '';
  const receiptNumber = invoice?.invoiceNumber || invoice?.id || `REC-${Date.now()}`;
  const transactionId = invoice?.transactionId || invoice?.exchangeReference?.returnId || receiptNumber;
  const date = invoice?.createdAt || invoice?.date || new Date().toISOString();
  const cashierName = snapshot.cashierName || invoice?.cashierName || invoice?.createdBy || invoice?.cashier || 'Cashier';
  const customerName = invoice?.customerName || 'Walk-in Customer';
  const customerPhone = invoice?.customerPhone || undefined;

  const items = (invoice?.items || []).map((it: any) => {
    const price = Number(it.price ?? it.sellingPrice ?? it.unitPrice ?? 0);
    const qty = Number(it.quantity ?? 1);
    const tax = Number(it.tax ?? it.taxAmount ?? 0);
    const lineTotal = Number(it.lineTotal ?? (price * qty));
    return {
      name: it.name || it.productName || 'Product',
      sku: it.sku || it.productSku || undefined,
      quantity: qty,
      unit: it.unit || 'unit',
      unitPrice: price,
      lineTotal,
      taxAmount: tax
    };
  });

  const subtotal = Number(invoice?.subtotal ?? items.reduce((acc: number, it: any) => acc + (it.unitPrice * it.quantity), 0));
  const discount = Number(invoice?.discount ?? 0);
  const tax = Number(invoice?.tax ?? 0);
  const grandTotal = Number(invoice?.grandTotal ?? invoice?.grandtotal ?? (subtotal + tax - discount));
  const paymentMode = (invoice?.paymentMode || invoice?.paymentMethod || 'CASH').toUpperCase() as any;
  const amountPaid = Number(invoice?.amountPaid ?? grandTotal);
  const changeDue = Math.max(0, Math.round((amountPaid - grandTotal) * 100) / 100);
  const termsAndConditions = business?.terms || 'Thank you for shopping with us! Fresh organic items once sold cannot be returned without original receipt.';

  return {
    businessName,
    businessLogo: business?.logo || null,
    storeName,
    storeAddress,
    storePhone,
    storeGstin,
    receiptNumber,
    transactionId,
    date,
    cashierName,
    customerName,
    customerPhone,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    paymentMode,
    amountPaid: Math.round(amountPaid * 100) / 100,
    changeDue,
    termsAndConditions
  };
}

/**
 * Generates formatted thermal text commands (ESC/POS or standard 58mm/80mm monospace)
 */
export function formatReceiptText(receipt: POSReceiptData, charWidth: number = 42, template?: Partial<ReceiptTemplate>): string {
  const tpl = mergeReceiptTemplate(template);
  const line = '-'.repeat(charWidth);
  const doubleLine = '='.repeat(charWidth);

  function center(text: string): string {
    const pad = Math.max(0, Math.floor((charWidth - text.length) / 2));
    return ' '.repeat(pad) + text;
  }

  function row(left: string, right: string): string {
    const space = Math.max(1, charWidth - left.length - right.length);
    return left + ' '.repeat(space) + right;
  }

  const lines: string[] = [];
  if (tpl.header.showBusinessName) lines.push(center(receipt.businessName.toUpperCase()));
  if (tpl.header.showStoreName && receipt.storeName && receipt.storeName !== receipt.businessName) {
    lines.push(center(receipt.storeName));
  }
  if (tpl.header.showAddress && receipt.storeAddress) lines.push(center(receipt.storeAddress));
  if (tpl.header.showContact && receipt.storePhone) lines.push(center(`Phone: ${receipt.storePhone}`));
  if (tpl.header.showGstin && receipt.storeGstin) lines.push(center(`GSTIN: ${receipt.storeGstin}`));
  lines.push(doubleLine);

  if (tpl.transaction.showInvoiceNumber) {
    lines.push(row(`Invoice # ${receipt.receiptNumber}`, new Date(receipt.date).toLocaleDateString('en-IN')));
  }
  if (tpl.header.showDateTime || tpl.header.showCashier) {
    const left = tpl.header.showDateTime
      ? new Date(receipt.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : '';
    const right = tpl.header.showCashier ? `Cashier: ${receipt.cashierName}` : '';
    lines.push(row(left, right));
  }
  lines.push(line);

  lines.push(row('Item Description', tpl.transaction.showRate ? 'Qty x Rate   Total' : 'Qty   Total'));
  lines.push(line);

  for (const it of receipt.items) {
    const left = `${it.name.slice(0, 22)}`;
    const qtyText = tpl.transaction.showQuantity ? `${it.quantity}x` : '';
    const rateText = tpl.transaction.showRate ? `${it.unitPrice.toFixed(0)} ` : '';
    const right = `${qtyText}${rateText}₹${it.lineTotal.toFixed(2)}`;
    lines.push(row(left, right));
    if (tpl.transaction.showItemSku && it.sku) {
      lines.push(`  SKU ${it.sku}`);
    }
  }

  lines.push(line);
  lines.push(row('Subtotal:', `₹${receipt.subtotal.toFixed(2)}`));
  if (tpl.transaction.showDiscount && receipt.discount > 0) {
    lines.push(row('Discount:', `-₹${receipt.discount.toFixed(2)}`));
  }
  if (tpl.transaction.showTax && receipt.tax > 0) {
    const halfTax = Math.round((receipt.tax / 2) * 100) / 100;
    lines.push(row('CGST:', `₹${halfTax.toFixed(2)}`));
    lines.push(row('SGST:', `₹${halfTax.toFixed(2)}`));
  }
  lines.push(doubleLine);
  lines.push(row('GRAND TOTAL:', `₹${receipt.grandTotal.toFixed(2)}`));
  lines.push(doubleLine);
  lines.push(row(`Payment Mode (${receipt.paymentMode}):`, `₹${receipt.amountPaid.toFixed(2)}`));
  if (receipt.changeDue > 0) {
    lines.push(row('Change Returned:', `₹${receipt.changeDue.toFixed(2)}`));
  }
  if (tpl.transaction.showInvoiceBarcode) {
    lines.push('');
    lines.push(center(`Invoice: ${receipt.receiptNumber}`));
  }

  lines.push('');
  lines.push(center(tpl.footer.text || receipt.termsAndConditions || 'Thank you for shopping!'));
  lines.push('');

  return lines.join('\n');
}

function escapeReceiptHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates clean thermal HTML markup for browser window.print() or iframe print preview
 */
export function formatReceiptHtml(receipt: POSReceiptData, widthMm: number = 80, template?: Partial<ReceiptTemplate>): string {
  const tpl = mergeReceiptTemplate({ ...(template || {}), paperWidthMm: (widthMm === 58 ? 58 : template?.paperWidthMm || 80) as 58 | 80 });
  const businessName = escapeReceiptHtml(receipt.businessName);
  const storeName = escapeReceiptHtml(receipt.storeName);
  const storeAddress = escapeReceiptHtml(receipt.storeAddress);
  const storePhone = escapeReceiptHtml(receipt.storePhone);
  const storeGstin = escapeReceiptHtml(receipt.storeGstin);
  const receiptNumber = escapeReceiptHtml(receipt.receiptNumber);
  const cashierName = escapeReceiptHtml(receipt.cashierName);
  const termsAndConditions = escapeReceiptHtml(tpl.footer.text || receipt.termsAndConditions || 'Thank you for shopping!');
  const density = tpl.style.density === 'compact'
    ? { padY: '3mm', font: '10px', rowPad: '2px', headerGap: '4px' }
    : tpl.style.density === 'spacious'
      ? { padY: '5mm', font: '12px', rowPad: '4px', headerGap: '8px' }
      : { padY: '4mm', font: '11px', rowPad: '3px', headerGap: '6px' };
  const titleSize = Math.round(14 * tpl.style.businessNameScale);
  const barcodeSvg = tpl.transaction.showInvoiceBarcode && tpl.transaction.barcodeType === 'CODE128'
    ? generateBarcodeSvg(receipt.receiptNumber, {
      width: widthMm === 58 ? 0.86 : 1.05,
      height: widthMm === 58 ? 30 : 36,
      includeText: true,
      fontSize: widthMm === 58 ? 8 : 10,
      quietZone: 8,
      color: '#000000'
    })
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt #${receiptNumber}</title>
      <style>
        @page {
          size: ${widthMm}mm auto;
          margin: 0mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
          width: ${widthMm}mm;
          margin: 0 auto;
          padding: ${density.padY} 3mm;
          font-size: ${density.font};
          line-height: 1.35;
          color: #000;
          background: #fff;
          box-sizing: border-box;
        }
        .header { text-align: ${tpl.style.alignment}; margin-bottom: ${density.headerGap}; }
        .receipt-logo { width: ${tpl.style.logoSize === 'lg' ? 17 : tpl.style.logoSize === 'sm' ? 10 : 13}mm; height: ${tpl.style.logoSize === 'lg' ? 17 : tpl.style.logoSize === 'sm' ? 10 : 13}mm; object-fit: contain; margin: 0 auto 3px; }
        .biz-name { font-size: ${titleSize}px; font-weight: ${tpl.style.businessNameBold ? 800 : 650}; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0; }
        .biz-sub { font-size: 10px; color: #333; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        .double-divider { border-top: 2px solid #000; margin: 6px 0; }
        .meta-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 10px; }
        .items-table th { text-align: left; border-bottom: 1px solid #000; padding: 2px 0; font-size: 9px; }
        .items-table td { padding: ${density.rowPad} 0; vertical-align: top; }
        .qty-col { text-align: center; }
        .rate-col, .total-col { text-align: right; }
        .total-section { margin-top: 4px; }
        .total-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; }
        .grand-total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; margin: 4px 0; }
        .barcode-block { margin: 8px 0 3px; text-align: center; page-break-inside: avoid; }
        .barcode-caption { font-size: 9px; font-family: monospace, monospace; margin-bottom: 2px; }
        .footer { text-align: center; font-size: 9px; color: #444; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        ${tpl.header.showLogo && receipt.businessLogo ? `<img class="receipt-logo" src="${escapeReceiptHtml(receipt.businessLogo)}" alt="" />` : ''}
        ${tpl.header.showBusinessName ? `<div class="biz-name">${businessName}</div>` : ''}
        ${tpl.header.showStoreName ? `<div class="biz-sub">${storeName}</div>` : ''}
        ${tpl.header.showAddress && receipt.storeAddress ? `<div class="biz-sub">${storeAddress}</div>` : ''}
        ${tpl.header.showContact && receipt.storePhone ? `<div class="biz-sub">Ph: ${storePhone}</div>` : ''}
        ${tpl.header.showGstin && receipt.storeGstin ? `<div class="biz-sub">GSTIN: ${storeGstin}</div>` : ''}
      </div>

      <div class="divider"></div>

      ${tpl.transaction.showInvoiceNumber ? `<div class="meta-row">
        <span>Receipt: #${receiptNumber}</span>
        <span>${new Date(receipt.date).toLocaleDateString('en-IN')}</span>
      </div>` : ''}
      ${(tpl.header.showCashier || tpl.header.showDateTime) ? `<div class="meta-row">
        <span>${tpl.header.showCashier ? `Cashier: ${cashierName}` : ''}</span>
        <span>${tpl.header.showDateTime ? new Date(receipt.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
      </div>` : ''}

      <div class="divider"></div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width:50%">Item</th>
            ${tpl.transaction.showQuantity ? '<th class="qty-col" style="width:15%">Qty</th>' : ''}
            ${tpl.transaction.showRate ? '<th class="rate-col" style="width:15%">Rate</th>' : ''}
            <th class="total-col" style="width:20%">Total</th>
          </tr>
        </thead>
        <tbody>
          ${receipt.items
            .map(
              (it) => `
            <tr>
              <td>${escapeReceiptHtml(it.name)}${tpl.transaction.showItemSku && it.sku ? `<br><span style="font-size:9px;color:#444">SKU ${escapeReceiptHtml(it.sku)}</span>` : ''}</td>
              ${tpl.transaction.showQuantity ? `<td class="qty-col">${it.quantity}</td>` : ''}
              ${tpl.transaction.showRate ? `<td class="rate-col">₹${it.unitPrice.toFixed(0)}</td>` : ''}
              <td class="total-col">₹${it.lineTotal.toFixed(2)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="divider"></div>

      <div class="total-section">
        <div class="total-row">
          <span>Subtotal</span>
          <span>₹${receipt.subtotal.toFixed(2)}</span>
        </div>
        ${
          tpl.transaction.showDiscount && receipt.discount > 0
            ? `
          <div class="total-row">
            <span>Discount</span>
            <span>-₹${receipt.discount.toFixed(2)}</span>
          </div>
        `
            : ''
        }
        ${
          tpl.transaction.showTax && receipt.tax > 0
            ? `
          <div class="total-row">
            <span>CGST</span>
            <span>₹${(receipt.tax / 2).toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>SGST</span>
            <span>₹${(receipt.tax / 2).toFixed(2)}</span>
          </div>
        `
            : ''
        }
        <div class="double-divider"></div>
        <div class="grand-total-row">
          <span>GRAND TOTAL</span>
          <span>₹${receipt.grandTotal.toFixed(2)}</span>
        </div>
        <div class="double-divider"></div>
        <div class="total-row">
          <span>Paid (${receipt.paymentMode})</span>
          <span>₹${receipt.amountPaid.toFixed(2)}</span>
        </div>
        ${
          receipt.changeDue > 0
            ? `
          <div class="total-row">
            <span>Change Due</span>
            <span>₹${receipt.changeDue.toFixed(2)}</span>
          </div>
        `
            : ''
        }
      </div>

      ${barcodeSvg ? `<div class="barcode-block"><div class="barcode-caption">Invoice # ${receiptNumber}</div>${barcodeSvg}</div>` : ''}

      <div class="footer">
        <div>${termsAndConditions}</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Dispatches print job using local workstation agent (if online) or triggers browser print fallback
 */
export async function dispatchReceiptPrint(
  receiptData: POSReceiptData,
  options?: {
    printerName?: string;
    printerLanguage?: string;
    paperWidthMm?: number;
    template?: Partial<ReceiptTemplate>;
  }
): Promise<{ success: boolean; method: 'native' | 'browser'; message?: string }> {
  const template = mergeReceiptTemplate(options?.template);
  const paperWidthMm = options?.paperWidthMm || template.paperWidthMm || 80;
  const textRaw = formatReceiptText(receiptData, paperWidthMm === 58 ? 32 : 42, template);

  // Attempt local native print agent dispatch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch('http://127.0.0.1:9123/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerName: options?.printerName || 'POS-Thermal-Receipt',
        printerLanguage: options?.printerLanguage || 'RAW',
        rawCommands: textRaw,
        copies: 1
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return { success: true, method: 'native', message: 'Print job dispatched to local thermal printer' };
      }
    }
  } catch {
    // Print agent not running or unreachable -> Fallback to browser print window
  }

  // Fallback to seamless browser print
  if (typeof window !== 'undefined') {
    try {
      const html = formatReceiptHtml(receiptData, paperWidthMm, template);
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);

      const frameDoc = printIframe.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(html);
        frameDoc.close();
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();

        setTimeout(() => {
          try {
            document.body.removeChild(printIframe);
          } catch {}
        }, 1000);

        return { success: true, method: 'browser', message: 'Receipt opened in browser print dialog' };
      }
    } catch (e: any) {
      return { success: false, method: 'browser', message: e?.message || 'Failed to open browser print dialog' };
    }
  }

  return { success: false, method: 'browser', message: 'Window object not available' };
}
