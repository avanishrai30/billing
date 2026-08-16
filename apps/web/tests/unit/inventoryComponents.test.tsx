import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  InventoryHeader,
  InventorySummaryCards,
  InventoryFilters,
  InventoryTable
} from '../../features/inventory/components';
import type { InventoryBalance, InventorySummary } from '../../features/inventory/types';

describe('Inventory Component Layer Unit Suite', () => {
  const sampleSummary: InventorySummary = {
    totalProducts: 20,
    totalTrackedItems: 18,
    totalUnits: 1250,
    lowStockCount: 3,
    outOfStockCount: 1,
    inventoryValue: 68500,
    locationId: 'store-1'
  };

  const sampleBalances: InventoryBalance[] = [
    {
      productId: 'prod-101',
      productName: 'A2 Cow Ghee 1L',
      sku: 'GHEE-1L',
      locationId: 'store-1',
      quantity: 45,
      reservedQuantity: 5,
      reorderLevel: 10,
      cost: 450,
      unit: 'tin',
      category: 'Dairy'
    },
    {
      productId: 'prod-102',
      productName: 'Organic Paneer 500g',
      sku: 'PAN-500',
      locationId: 'store-1',
      quantity: 4,
      reservedQuantity: 0,
      reorderLevel: 10,
      cost: 160,
      unit: 'pack',
      category: 'Dairy'
    }
  ];

  it('1. InventoryHeader renders title, outlet switcher, and mutation triggers', () => {
    const handleAdjust = jest.fn();
    const handleTransfer = jest.fn();
    const handleLocation = jest.fn();

    render(
      <InventoryHeader
        selectedLocation="store-1"
        storeOptions={[
          { value: 'all', label: 'All Store Outlets' },
          { value: 'store-1', label: 'Flagship Store' }
        ]}
        onSelectLocation={handleLocation}
        canAdjust={true}
        canTransfer={true}
        onOpenAdjustment={handleAdjust}
        onOpenTransfer={handleTransfer}
      />
    );

    expect(screen.getByText('Inventory & Stock Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stock adjustment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /transfer stock/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /stock adjustment/i }));
    expect(handleAdjust).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /transfer stock/i }));
    expect(handleTransfer).toHaveBeenCalledTimes(1);
  });

  it('2. InventorySummaryCards renders 4 authoritative metric cards with formatted numbers', () => {
    render(<InventorySummaryCards summary={sampleSummary} isLoading={false} />);

    expect(screen.getByText('1,250')).toBeInTheDocument(); // Total units
    expect(screen.getByText('3')).toBeInTheDocument(); // Low stock count
    expect(screen.getByText('1')).toBeInTheDocument(); // Out of stock count
    expect(screen.getByText(/₹ 68,500.00/)).toBeInTheDocument(); // Valuation
  });

  it('3. InventoryFilters triggers search, status pill selection, and reset', () => {
    const handleSearch = jest.fn();
    const handleStatus = jest.fn();
    const handleCategory = jest.fn();
    const handleClear = jest.fn();

    render(
      <InventoryFilters
        searchQuery="Ghee"
        onSearchChange={handleSearch}
        statusFilter="ALL"
        onStatusFilterChange={handleStatus}
        categoryFilter="Dairy"
        onCategoryFilterChange={handleCategory}
        categories={['Dairy', 'Bakery']}
        onClearFilters={handleClear}
      />
    );

    expect(screen.getByDisplayValue('Ghee')).toBeInTheDocument();

    const lowStockPill = screen.getByRole('button', { name: 'Low Stock' });
    fireEvent.click(lowStockPill);
    expect(handleStatus).toHaveBeenCalledWith('LOW_STOCK');

    const resetBtn = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('4. InventoryTable renders stock balances with computed availability and badges', () => {
    const handleViewLedger = jest.fn();

    render(
      <InventoryTable
        balances={sampleBalances}
        isLoading={false}
        canAdjust={true}
        canTransfer={true}
        onViewLedger={handleViewLedger}
        onAdjustStock={jest.fn()}
        onTransferStock={jest.fn()}
      />
    );

    expect(screen.getByText('A2 Cow Ghee 1L')).toBeInTheDocument();
    expect(screen.getByText('Organic Paneer 500g')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument(); // Available 45 - 5
    expect(screen.getByText('In Stock')).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();

    const historyBtn = screen.getByRole('button', {
      name: /view movement history for a2 cow ghee 1l/i
    });
    fireEvent.click(historyBtn);
    expect(handleViewLedger).toHaveBeenCalledTimes(1);
  });
});
