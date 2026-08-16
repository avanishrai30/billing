import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  InvoiceHeader,
  InvoiceSummary,
  InvoiceFilters,
  InvoiceTable,
  InvoiceStatusBadge
} from '../../features/invoices/components';
import type { Invoice, InvoiceSummaryMetrics } from '../../features/invoices/types';

describe('Invoice Component Layer Unit Suite', () => {
  const sampleMetrics: InvoiceSummaryMetrics = {
    totalInvoices: 25,
    totalRevenue: 45000,
    totalTax: 3200,
    totalDiscount: 1500,
    averageTicket: 1800
  };

  const sampleInvoices: Invoice[] = [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-001',
      locationId: 'store-1',
      customerName: 'Avanish Rai',
      customerPhone: '9876543210',
      items: [
        {
          productId: 'prod-1',
          name: 'A2 Cow Ghee 1L',
          quantity: 2,
          price: 650,
          lineTotal: 1300
        }
      ],
      subtotal: 1300,
      discount: 0,
      tax: 65,
      grandTotal: 1365,
      paymentMode: 'UPI',
      status: 'PAID',
      createdAt: new Date().toISOString()
    },
    {
      id: 'inv-2',
      invoiceNumber: 'INV-2026-002',
      locationId: 'store-1',
      customerName: 'Rohan Sharma',
      customerPhone: '9876543211',
      items: [
        {
          productId: 'prod-2',
          name: 'Organic Honey 500g',
          quantity: 1,
          price: 350,
          lineTotal: 350
        }
      ],
      subtotal: 350,
      discount: 50,
      tax: 15,
      grandTotal: 315,
      paymentMode: 'CASH',
      status: 'VOIDED',
      isArchived: true,
      createdAt: new Date().toISOString()
    }
  ];

  it('1. InvoiceHeader renders title, store selector, and New POS Sale button', () => {
    const handleLocation = jest.fn();

    render(
      <InvoiceHeader
        selectedLocation="store-1"
        storeOptions={[
          { value: 'all', label: 'All Store Outlets' },
          { value: 'store-1', label: 'Flagship Store' }
        ]}
        onSelectLocation={handleLocation}
        canCreatePOS={true}
      />
    );

    expect(screen.getByText('Invoices & Sales Ledger')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new pos sale/i })).toBeInTheDocument();
  });

  it('2. InvoiceSummary renders 4 authoritative metric cards with formatted INR amounts', () => {
    render(<InvoiceSummary metrics={sampleMetrics} isLoading={false} />);

    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText(/₹ 45,000.00/)).toBeInTheDocument();
    expect(screen.getByText(/₹ 3,200.00/)).toBeInTheDocument();
    expect(screen.getByText(/₹ 1,800.00/)).toBeInTheDocument();
  });

  it('3. InvoiceFilters handles search, status tab clicks, and reset trigger', () => {
    const handleSearch = jest.fn();
    const handleStatus = jest.fn();
    const handleMode = jest.fn();
    const handleClear = jest.fn();

    render(
      <InvoiceFilters
        searchQuery="Avanish"
        onSearchChange={handleSearch}
        statusFilter="ALL"
        onStatusFilterChange={handleStatus}
        paymentModeFilter="ALL"
        onPaymentModeFilterChange={handleMode}
        onClearFilters={handleClear}
      />
    );

    expect(screen.getByDisplayValue('Avanish')).toBeInTheDocument();

    const voidedPill = screen.getByRole('button', { name: 'Voided' });
    fireEvent.click(voidedPill);
    expect(handleStatus).toHaveBeenCalledWith('VOIDED');

    const resetBtn = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('4. InvoiceTable renders invoices with customer details, grand total, and actions', () => {
    const handleViewDetail = jest.fn();
    const handleVoid = jest.fn();

    render(
      <InvoiceTable
        invoices={sampleInvoices}
        isLoading={false}
        canVoid={true}
        onViewDetail={handleViewDetail}
        onVoidInvoice={handleVoid}
        pagination={{ page: 1, limit: 50, total: 2, totalPages: 1, hasNext: false, hasPrev: false }}
        onPageChange={jest.fn()}
      />
    );

    expect(screen.getByText('INV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Avanish Rai')).toBeInTheDocument();
    expect(screen.getByText('Rohan Sharma')).toBeInTheDocument();
    expect(screen.getByText(/₹ 1,365.00/)).toBeInTheDocument();

    const viewBtn = screen.getByRole('button', {
      name: /view details for invoice inv-2026-001/i
    });
    fireEvent.click(viewBtn);
    expect(handleViewDetail).toHaveBeenCalledTimes(1);

    const voidBtn = screen.getByRole('button', {
      name: /void invoice inv-2026-001/i
    });
    fireEvent.click(voidBtn);
    expect(handleVoid).toHaveBeenCalledTimes(1);
  });

  it('5. InvoiceStatusBadge displays appropriate color variant for status', () => {
    const { rerender } = render(<InvoiceStatusBadge status="PAID" />);
    expect(screen.getByText('Paid / Completed')).toBeInTheDocument();

    rerender(<InvoiceStatusBadge status="VOIDED" isArchived={true} />);
    expect(screen.getByText('Voided')).toBeInTheDocument();
  });
});
