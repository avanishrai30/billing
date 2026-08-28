import type { POSReceiptData, POSReceiptOptions, POSInvoiceDoc } from '../../features/pos/types';
import { sendNativePrintJob } from './printAgent';

/**
 * Builds canonical POS Receipt data structure from immutable invoice snapshot.
 */
export function generateCanonicalReceipt(
  invoice: any,
  store?: { name?: string; address?: string; phone?: string; gstin?: string } | null,
  business?: { name?: string; logo?: string; address?: string; phone?: string; gstin?: string; terms?: string } | null,
  options?: POSReceiptOptions
): POSReceiptData {
  const businessName = business?.name || store?.name || 'VC ORGANIC';
  const storeName = store?.name || business?.name || 'Main Outlet';
  const storeAddress = store?.address || business?.address || '';
  const storePhone = store?.phone || business?.phone || '';
  const storeGstin = store?.gstin || business?.gstin || '';
  const receiptNumber = invoice?.invoiceNumber || invoice?.id || `REC-${Date.now()}`;
  const transactionId = invoice?.transactionId || invoice?.exchangeReference?.returnId || receiptNumber;
  const date = invoice?.createdAt || invoice?.date || new Date().toISOString();
  const cashierName = invoice?.createdBy || invoice?.cashier || 'Cashier';
  const customerName = invoice?.customerName || 'Walk-in Customer';
  const customerPhone = invoice?.customerPhone || undefined;

  const items = (invoice?.items || []).map((it: any) => {
    const price = Number(it.price ?? it.sellingPrice ?? it.unitPrice ?? 0);
    const qty = Number(it.quantity ?? 1);
    const tax = Number(it.tax ?? it.taxAmount ?? 0);
    const lineTotal = Number(it.lineTotal ?? (price * qty));
    return {
      name: it.name || it.productName || 'Product',
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
export function formatReceiptText(receipt: POSReceiptData, charWidth: number = 42): string {
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
  lines.push(center(receipt.businessName.toUpperCase()));
  if (receipt.storeName && receipt.storeName !== receipt.businessName) {
    lines.push(center(receipt.storeName));
  }
  if (receipt.storeAddress) lines.push(center(receipt.storeAddress));
  if (receipt.storePhone) lines.push(center(`Phone: ${receipt.storePhone}`));
  if (receipt.storeGstin) lines.push(center(`GSTIN: ${receipt.storeGstin}`));
  lines.push(doubleLine);

  lines.push(row(`Receipt: #${receipt.receiptNumber}`, new Date(receipt.date).toLocaleDateString('en-IN')));
  lines.push(row(`Time: ${new Date(receipt.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, `Cashier: ${receipt.cashierName}`));
  lines.push(row(`Customer: ${receipt.customerName}`, receipt.customerPhone ? `Ph: ${receipt.customerPhone}` : ''));
  lines.push(line);

  lines.push(row('Item Description', 'Qty x Rate   Total'));
  lines.push(line);

  for (const it of receipt.items) {
    const left = `${it.name.slice(0, 22)}`;
    const right = `${it.quantity}x${it.unitPrice.toFixed(0)} ₹${it.lineTotal.toFixed(2)}`;
    lines.push(row(left, right));
  }

  lines.push(line);
  lines.push(row('Subtotal:', `₹${receipt.subtotal.toFixed(2)}`));
  if (receipt.discount > 0) {
    lines.push(row('Discount:', `-₹${receipt.discount.toFixed(2)}`));
  }
  if (receipt.tax > 0) {
    lines.push(row('GST Tax:', `₹${receipt.tax.toFixed(2)}`));
  }
  lines.push(doubleLine);
  lines.push(row('GRAND TOTAL:', `₹${receipt.grandTotal.toFixed(2)}`));
  lines.push(doubleLine);
  lines.push(row(`Payment Mode (${receipt.paymentMode}):`, `₹${receipt.amountPaid.toFixed(2)}`));
  if (receipt.changeDue > 0) {
    lines.push(row('Change Returned:', `₹${receipt.changeDue.toFixed(2)}`));
  }

  lines.push('');
  lines.push(center(receipt.termsAndConditions || 'Thank you for shopping!'));
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
export function formatReceiptHtml(receipt: POSReceiptData, widthMm: number = 80): string {
  const businessName = escapeReceiptHtml(receipt.businessName);
  const storeName = escapeReceiptHtml(receipt.storeName);
  const storeAddress = escapeReceiptHtml(receipt.storeAddress);
  const storePhone = escapeReceiptHtml(receipt.storePhone);
  const storeGstin = escapeReceiptHtml(receipt.storeGstin);
  const receiptNumber = escapeReceiptHtml(receipt.receiptNumber);
  const cashierName = escapeReceiptHtml(receipt.cashierName);
  const customerName = escapeReceiptHtml(receipt.customerName);
  const customerPhone = escapeReceiptHtml(receipt.customerPhone);
  const termsAndConditions = escapeReceiptHtml(receipt.termsAndConditions || 'Thank you for shopping!');

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
          padding: 4mm 3mm;
          font-size: 11px;
          line-height: 1.35;
          color: #000;
          background: #fff;
          box-sizing: border-box;
        }
        .header { text-align: center; margin-bottom: 6px; }
        .biz-name { font-size: 14px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
        .biz-sub { font-size: 10px; color: #333; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        .double-divider { border-top: 2px solid #000; margin: 6px 0; }
        .meta-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 10px; }
        .items-table th { text-align: left; border-bottom: 1px solid #000; padding: 2px 0; font-size: 9px; }
        .items-table td { padding: 3px 0; vertical-align: top; }
        .qty-col { text-align: center; }
        .rate-col, .total-col { text-align: right; }
        .total-section { margin-top: 4px; }
        .total-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; }
        .grand-total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; margin: 4px 0; }
        .footer { text-align: center; font-size: 9px; color: #444; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="biz-name">${businessName}</div>
        <div class="biz-sub">${storeName}</div>
        ${receipt.storeAddress ? `<div class="biz-sub">${storeAddress}</div>` : ''}
        ${receipt.storePhone ? `<div class="biz-sub">Ph: ${storePhone}</div>` : ''}
        ${receipt.storeGstin ? `<div class="biz-sub">GSTIN: ${storeGstin}</div>` : ''}
      </div>

      <div class="divider"></div>

      <div class="meta-row">
        <span>Receipt: #${receiptNumber}</span>
        <span>${new Date(receipt.date).toLocaleDateString('en-IN')}</span>
      </div>
      <div class="meta-row">
        <span>Cashier: ${cashierName}</span>
        <span>${new Date(receipt.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="meta-row">
        <span>Cust: ${customerName}</span>
        <span>${receipt.customerPhone ? customerPhone : ''}</span>
      </div>

      <div class="divider"></div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width:50%">Item</th>
            <th class="qty-col" style="width:15%">Qty</th>
            <th class="rate-col" style="width:15%">Rate</th>
            <th class="total-col" style="width:20%">Total</th>
          </tr>
        </thead>
        <tbody>
          ${receipt.items
            .map(
              (it) => `
            <tr>
              <td>${escapeReceiptHtml(it.name)}</td>
              <td class="qty-col">${it.quantity}</td>
              <td class="rate-col">₹${it.unitPrice.toFixed(0)}</td>
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
          receipt.discount > 0
            ? `
          <div class="total-row">
            <span>Discount</span>
            <span>-₹${receipt.discount.toFixed(2)}</span>
          </div>
        `
            : ''
        }
        ${
          receipt.tax > 0
            ? `
          <div class="total-row">
            <span>GST Tax</span>
            <span>₹${receipt.tax.toFixed(2)}</span>
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
  }
): Promise<{ success: boolean; method: 'native' | 'browser'; message?: string }> {
  const textRaw = formatReceiptText(receiptData, options?.paperWidthMm === 58 ? 32 : 42);

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
      const html = formatReceiptHtml(receiptData, options?.paperWidthMm || 80);
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
