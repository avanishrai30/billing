import {
  normalizeCustomerPhone,
  formatPhoneDisplay,
  calculateReturnableQuantities,
  calculateExchangeTotals,
  calculatePOSLine,
  calculatePOSTotals
} from '../../features/pos/calculations';
import { generateCanonicalReceipt } from '../../lib/utils/receiptDocument';

describe('POS Calculations, Phone Normalization, and Canonical Receipts', () => {
  describe('Phone-First Normalization', () => {
    test('1. Normalizes +91 Indian format with spaces and dashes', () => {
      expect(normalizeCustomerPhone('+91 98220 11223')).toBe('9822011223');
      expect(normalizeCustomerPhone('+91-98220-11223')).toBe('9822011223');
      expect(normalizeCustomerPhone('919822011223')).toBe('9822011223');
      expect(normalizeCustomerPhone('09822011223')).toBe('9822011223');
      expect(normalizeCustomerPhone('9822011223')).toBe('9822011223');
    });

    test('2. Formats 10-digit phone for human display', () => {
      expect(formatPhoneDisplay('9822011223')).toBe('+91 98220 11223');
      expect(formatPhoneDisplay('+919822011223')).toBe('+91 98220 11223');
    });
  });

  describe('Returnable Quantity Calculation', () => {
    test('3. Accurately calculates returnable balance with multiple prior returns', () => {
      const invoice = {
        invoiceNumber: 'INV-101',
        items: [
          { productId: 'p1', name: 'Ghee 1L', quantity: 5, price: 650, gst: 5 },
          { productId: 'p2', name: 'Honey 500g', quantity: 2, price: 350, gst: 5 }
        ]
      };

      const priorReturns = [
        {
          returnId: 'RET-1',
          returnedItems: [{ productId: 'p1', quantity: 2 }]
        },
        {
          returnId: 'RET-2',
          returnedItems: [{ productId: 'p1', quantity: 1 }, { productId: 'p2', quantity: 1 }]
        }
      ];

      const returnable = calculateReturnableQuantities(invoice, priorReturns);
      expect(returnable[0].soldQuantity).toBe(5);
      expect(returnable[0].alreadyReturnedQuantity).toBe(3);
      expect(returnable[0].returnableQuantity).toBe(2);

      expect(returnable[1].soldQuantity).toBe(2);
      expect(returnable[1].alreadyReturnedQuantity).toBe(1);
      expect(returnable[1].returnableQuantity).toBe(1);
    });
  });

  describe('Exchange Calculations', () => {
    test('4. Customer pays difference when replacement > return credit', () => {
      const returnItems = [{ price: 500, quantity: 1, gst: 0 }]; // Credit ₹500
      const replacementItems = [{ price: 650, quantity: 1, gst: 0 }]; // Cost ₹650

      const totals = calculateExchangeTotals(returnItems, replacementItems);
      expect(totals.returnCredit).toBe(500);
      expect(totals.replacementGrandTotal).toBe(650);
      expect(totals.netDifference).toBe(150);
      expect(totals.netPayable).toBe(150);
      expect(totals.refundDue).toBe(0);
    });

    test('5. Store refunds customer when return credit > replacement', () => {
      const returnItems = [{ price: 1000, quantity: 1, gst: 0 }]; // Credit ₹1000
      const replacementItems = [{ price: 650, quantity: 1, gst: 0 }]; // Cost ₹650

      const totals = calculateExchangeTotals(returnItems, replacementItems);
      expect(totals.returnCredit).toBe(1000);
      expect(totals.replacementGrandTotal).toBe(650);
      expect(totals.netDifference).toBe(-350);
      expect(totals.netPayable).toBe(0);
      expect(totals.refundDue).toBe(350);
    });
  });

  describe('Canonical Receipt Document Generation', () => {
    test('6. Produces immutable canonical receipt data from invoice record', () => {
      const invoice = {
        invoiceNumber: 'INV-2026-999',
        customerId: 'cust-1',
        customerName: 'Rajesh Sharma',
        customerPhone: '9822011223',
        paymentMode: 'UPI',
        items: [
          { name: 'Organic Cow Ghee', quantity: 2, price: 650, lineTotal: 1300 },
          { name: 'Cold Pressed Sesame Oil', quantity: 1, price: 280, lineTotal: 280 }
        ],
        subtotal: 1580,
        tax: 79,
        discount: 50,
        grandTotal: 1609
      };

      const receipt = generateCanonicalReceipt(invoice, { name: 'Pune Flagship Store' });
      expect(receipt.receiptNumber).toBe('INV-2026-999');
      expect(receipt.customerName).toBe('Rajesh Sharma');
      expect(receipt.customerPhone).toBe('9822011223');
      expect(receipt.items.length).toBe(2);
      expect(receipt.grandTotal).toBe(1609);
      expect(receipt.paymentMode).toBe('UPI');
    });
  });
});
