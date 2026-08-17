import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import {
  DashboardHeader,
  KPIGrid,
  SalesSummaryChart,
  LowStockWatchlist,
  RecentSalesTable,
  RecentPurchasesTable,
  DashboardSkeleton
} from '../../features/dashboard/components';
import type { DashboardMetrics } from '../../features/dashboard/types';

const mockMetrics: DashboardMetrics = {
  totalSales: 125400,
  netProfit: 38200,
  totalPurchases: 45000,
  franchiseEarnings: 5400,
  stockAssetValuationCost: 210000,
  stockAssetValuationRetail: 340000,
  totalProducts: 45,
  ownProducts: 30,
  externalProducts: 15,
  lowStockCount: 2,
  outOfStockCount: 1,
  categoriesCount: 6,
  brandsCount: 3,
  suppliersCount: 4,
  expiryWarningsCount: 1,
  invoiceCount: 180,
  purchaseCount: 12
};

describe('Dashboard Component Rendering & Information Hierarchy', () => {
  it('1. DashboardHeader renders title, store scope badge, and actions', () => {
    render(<DashboardHeader storeId="all" onRefresh={jest.fn()} />);
    expect(
      screen.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/all stores \(enterprise\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sync metrics/i })).toBeInTheDocument();
  });

  it('2. KPIGrid renders formatted financial values and counts', () => {
    render(<KPIGrid metrics={mockMetrics} />);
    expect(screen.getByText(/total gross sales/i)).toBeInTheDocument();
    expect(screen.getByText(/calculated net profit/i)).toBeInTheDocument();
    expect(screen.getByText(/procurement purchases/i)).toBeInTheDocument();
    expect(screen.getByText(/stock asset valuation/i)).toBeInTheDocument();
    expect(screen.getByText(/catalog skus/i)).toBeInTheDocument();
  });

  it('3. LowStockWatchlist renders items table when items exist', () => {
    const items = [
      {
        id: 'p1',
        name: 'Organic Milk 1L',
        category: 'Dairy',
        sku: 'AIA-MILK-1',
        stock: 3,
        reorder: 15,
        cost: 45,
        price: 60,
        unit: 'packet',
        image: null
      }
    ];

    render(<LowStockWatchlist items={items} />);
    expect(screen.getByText('Organic Milk 1L')).toBeInTheDocument();
    expect(screen.getByText('AIA-MILK-1')).toBeInTheDocument();
    expect(screen.getByText('3 packet')).toBeInTheDocument();
  });

  it('4. LowStockWatchlist renders EmptyState when items array is empty', () => {
    render(<LowStockWatchlist items={[]} />);
    expect(screen.getByText(/all stock levels healthy/i)).toBeInTheDocument();
  });

  it('5. RecentSalesTable and RecentPurchasesTable render empty states when empty', () => {
    render(
      <div>
        <RecentSalesTable invoices={[]} />
        <RecentPurchasesTable purchases={[]} />
      </div>
    );
    expect(screen.getByText(/no invoices recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/no purchases recorded/i)).toBeInTheDocument();
  });

  it('6. DashboardSkeleton renders rigid placeholders', () => {
    render(<DashboardSkeleton />);
    expect(screen.getByLabelText(/loading dashboard metrics/i)).toBeInTheDocument();
  });
});
