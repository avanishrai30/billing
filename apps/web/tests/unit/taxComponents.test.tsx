import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  TaxHeader,
  TaxSummaryCards,
  GSTBreakdown,
  GSTSlabBreakdown,
  OutwardGSTTable,
  InwardGSTTable,
  B2BSalesTable,
  B2CSalesTable,
  TaxFilters
} from '../../features/tax/components';
import type { TaxSummaryMetrics, GSTSlabMetrics } from '../../features/tax/types';

describe('Tax UI Components Suite', () => {
  const mockMetrics: TaxSummaryMetrics = {
    grossSales: 50000,
    taxableSales: 45000,
    outwardGst: 5000,
    cgstShare: 2500,
    sgstShare: 2500,
    purchaseTaxable: 20000,
    inwardGst: 1000,
    freightCharges: 500,
    franchiseTaxable: 15000,
    franchiseGst: 1200,
    b2bSalesTotal: 30000,
    b2bInvoicesCount: 15,
    b2cSalesTotal: 20000,
    b2cInvoicesCount: 35
  };

  const mockSlabs: GSTSlabMetrics[] = [
    {
      rate: 0,
      label: 'Exempt Goods',
      taxableValue: 5000,
      taxAmount: 0,
      cgst: 0,
      sgst: 0,
      sharePercent: 0,
      itemsCount: 10
    },
    {
      rate: 5,
      label: 'Essential Foods',
      taxableValue: 20000,
      taxAmount: 1000,
      cgst: 500,
      sgst: 500,
      sharePercent: 20,
      itemsCount: 50
    },
    {
      rate: 18,
      label: 'Enterprise Standard',
      taxableValue: 20000,
      taxAmount: 3600,
      cgst: 1800,
      sgst: 1800,
      sharePercent: 72,
      itemsCount: 40
    }
  ];

  it('1. TaxHeader renders title, status badge, and refresh button', () => {
    const onRefresh = jest.fn();

    render(
      <TaxHeader
        isLoading={false}
        onRefresh={onRefresh}
        activeStoreName="Mumbai Flagship"
      />
    );

    expect(screen.getByText('GST Compliance & Tax Reporting Ledger')).toBeInTheDocument();
    expect(screen.getByText('100% Tax Ledger Reconciled')).toBeInTheDocument();
    expect(screen.getByText('📍 Mumbai Flagship')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Refresh Reports'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('2. TaxSummaryCards renders financial KPI metrics', () => {
    render(<TaxSummaryCards metrics={mockMetrics} />);

    expect(screen.getByText('₹50,000.00')).toBeInTheDocument();
    expect(screen.getByText('₹5,000.00')).toBeInTheDocument();
    expect(screen.getByText('₹1,000.00')).toBeInTheDocument();
    expect(screen.getByText('₹4,000.00')).toBeInTheDocument(); // Net liability: 5000 - 1000
  });

  it('3. GSTBreakdown renders B2B/B2C counts and CGST/SGST shares', () => {
    render(<GSTBreakdown metrics={mockMetrics} />);

    expect(screen.getByText('₹30,000.00')).toBeInTheDocument();
    expect(screen.getByText('15 Invoices (GSTIN Verified)')).toBeInTheDocument();
    expect(screen.getByText('₹20,000.00')).toBeInTheDocument();
    expect(screen.getByText('35 Consumer Bills')).toBeInTheDocument();
    expect(screen.getAllByText('₹2,500.00')).toHaveLength(2); // CGST and SGST
  });

  it('4. GSTSlabBreakdown renders slab cards and 50/50 tax splits', () => {
    render(<GSTSlabBreakdown slabs={mockSlabs} />);

    expect(screen.getByText('Essential Foods')).toBeInTheDocument();
    expect(screen.getByText('5% Rate')).toBeInTheDocument();
    expect(screen.getByText('₹1000.00')).toBeInTheDocument();
    expect(screen.getAllByText('₹500.00')).toHaveLength(2); // CGST and SGST (5%)

    expect(screen.getByText('Enterprise Standard')).toBeInTheDocument();
    expect(screen.getByText('18% Rate')).toBeInTheDocument();
    expect(screen.getByText('₹3600.00')).toBeInTheDocument();
    expect(screen.getAllByText('₹1800.00')).toHaveLength(2); // CGST and SGST (18%)
  });

  it('5. TaxFilters handles tab changes and reset', () => {
    const onTabChange = jest.fn();
    const onReset = jest.fn();

    render(
      <TaxFilters
        activeTab="overview"
        onTabChange={onTabChange}
        storeId="store-1"
        onStoreIdChange={jest.fn()}
        startDate=""
        onStartDateChange={jest.fn()}
        endDate=""
        onEndDateChange={jest.fn()}
        stores={[]}
        isStoreScoped={false}
        onReset={onReset}
      />
    );

    fireEvent.click(screen.getByText('🏷️ GST Slabs (0/5/12/18%)'));
    expect(onTabChange).toHaveBeenCalledWith('slabs');

    fireEvent.click(screen.getByText('Reset Filters'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
