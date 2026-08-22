import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  PurchaseHeader,
  PurchaseItemsTable,
  PurchaseTransportSection,
  PurchaseTotalsSummary,
  PurchaseDetailDrawer,
  PurchaseVoidDialog,
  PurchaseHistory
} from '../../features/purchases/components';
import { usePurchasesQuery } from '../../features/purchases/hooks';
import type { PurchaseItem, PurchaseTransport, PurchaseDoc } from '../../features/purchases/types';

jest.mock('../../features/purchases/hooks');

describe('Purchase Component Layer & Interactions', () => {
  it('1. PurchaseHeader renders all inputs and handles changes', () => {
    const handleSupplier = jest.fn();
    const handleInvoice = jest.fn();

    render(
      <PurchaseHeader
        supplierName="Baramati Dairy"
        onSupplierChange={handleSupplier}
        invoiceNumber="INV-101"
        onInvoiceNumberChange={handleInvoice}
        purchaseDate="2026-08-16"
        onPurchaseDateChange={jest.fn()}
        locationId="store-1"
        onLocationChange={jest.fn()}
        reference="REF-99"
        onReferenceChange={jest.fn()}
        paymentStatus="PAID"
        onPaymentStatusChange={jest.fn()}
        notes=""
        onNotesChange={jest.fn()}
        suppliers={[{ id: 'sup-1', name: 'Baramati Dairy' }]}
        stores={[{ id: 'store-1', name: 'Flagship Outlet' }]}
      />
    );

    expect(screen.getByDisplayValue('Baramati Dairy')).toBeInTheDocument();
    expect(screen.getByDisplayValue('INV-101')).toBeInTheDocument();
    expect(screen.getByText(/procurement batch & inward header/i)).toBeInTheDocument();
  });

  it('2. PurchaseItemsTable renders item rows and adds new line item', () => {
    const items: PurchaseItem[] = [
      {
        name: 'Ghee 1L',
        sku: 'GHEE-1',
        quantity: 2,
        unit: 'tin',
        cost: 650,
        gstRate: 5,
        taxableValue: 1300,
        taxAmount: 65,
        lineTotal: 1365
      }
    ];

    const handleChange = jest.fn();

    render(
      <PurchaseItemsTable
        items={items}
        onChange={handleChange}
        availableProducts={[]}
      />
    );

    expect(screen.getByDisplayValue('Ghee 1L')).toBeInTheDocument();
    const addBtn = screen.getByRole('button', { name: /add line item/i });
    fireEvent.click(addBtn);
    expect(handleChange).toHaveBeenCalled();
  });

  it('3. PurchaseTransportSection renders toggle and freight fields', () => {
    const transport: PurchaseTransport = {
      enabled: true,
      transporter: 'VRL Logistics',
      charge: 800,
      taxRate: 5,
      taxAmount: 40,
      mode: 'ROAD'
    };

    render(
      <PurchaseTransportSection
        transport={transport}
        onChange={jest.fn()}
      />
    );

    expect(screen.getByDisplayValue('VRL Logistics')).toBeInTheDocument();
    expect(screen.getByDisplayValue('800')).toBeInTheDocument();
  });

  it('4. PurchaseTotalsSummary displays grand total in INR', () => {
    const totals = {
      goodsSubtotal: 1000,
      itemDiscountTotal: 50,
      goodsTaxable: 950,
      goodsGstTotal: 47.5,
      freightCharge: 200,
      freightGst: 10,
      otherCharges: 0,
      grandTotal: 1207.5
    };

    const handleSubmit = jest.fn();

    render(
      <PurchaseTotalsSummary
        totals={totals}
        otherCharges={0}
        onOtherChargesChange={jest.fn()}
        onSubmit={handleSubmit}
      />
    );

    expect(screen.getByText('₹ 1,207.50')).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /record inward purchase batch/i });
    fireEvent.click(submitBtn);
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('5. PurchaseDetailDrawer and PurchaseVoidDialog render modal dialogs', () => {
    const mockPurchase: PurchaseDoc = {
      id: 'pur-101',
      purchaseId: 'PO-2026-001',
      supplierName: 'Amul Dairy',
      invoiceNumber: 'AMUL-889',
      purchaseDate: '2026-08-16',
      locationId: 'store-1',
      paymentStatus: 'PAID',
      items: [{ name: 'Butter 500g', quantity: 10, cost: 250, gstRate: 12, lineTotal: 2800, unit: 'pack', taxableValue: 2500, taxAmount: 300 }],
      subtotal: 2500,
      taxAmount: 300,
      grandTotal: 2800,
      status: 'RECEIVED',
      createdAt: '2026-08-16T10:00:00Z'
    };

    render(
      <div>
        <PurchaseDetailDrawer
          purchase={mockPurchase}
          isOpen={true}
          onClose={jest.fn()}
        />
        <PurchaseVoidDialog
          purchase={mockPurchase}
          isOpen={true}
          onClose={jest.fn()}
          onConfirm={jest.fn()}
        />
      </div>
    );

    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    expect(screen.getByText(/stock ledger reversal warning/i)).toBeInTheDocument();
  });

  it('6. PurchaseHistory hides void action without purchases.void permission', () => {
    const mockPurchase: PurchaseDoc = {
      id: 'pur-101',
      purchaseId: 'PO-2026-001',
      supplierName: 'Amul Dairy',
      invoiceNumber: 'AMUL-889',
      purchaseDate: '2026-08-16',
      locationId: 'store-1',
      paymentStatus: 'PAID',
      items: [],
      subtotal: 2500,
      taxAmount: 300,
      grandTotal: 2800,
      status: 'RECEIVED',
      createdAt: '2026-08-16T10:00:00Z'
    };

    (usePurchasesQuery as jest.Mock).mockReturnValue({
      data: {
        purchases: [mockPurchase],
        pagination: {
          page: 1,
          limit: 15,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn()
    });

    const { rerender } = render(
      <PurchaseHistory
        onSelectPurchase={jest.fn()}
        onRequestVoid={jest.fn()}
        canVoid={false}
      />
    );

    expect(screen.getByLabelText('View details for PO-2026-001')).toBeInTheDocument();
    expect(screen.queryByLabelText('Void purchase PO-2026-001')).not.toBeInTheDocument();

    rerender(
      <PurchaseHistory
        onSelectPurchase={jest.fn()}
        onRequestVoid={jest.fn()}
        canVoid={true}
      />
    );

    expect(screen.getByLabelText('Void purchase PO-2026-001')).toBeInTheDocument();
  });
});
