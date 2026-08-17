import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ProductHeader,
  ProductSummaryCards,
  ProductFilters,
  ProductTable
} from '../../features/products/components';
import type { ProductDoc, ProductSummaryMetrics } from '../../features/products/types';

describe('Product Components Unit Suite', () => {
  const sampleMetrics: ProductSummaryMetrics = {
    totalCatalogProducts: 15,
    ownBrandCount: 10,
    externalBrandCount: 5,
    packagedCount: 12,
    looseCount: 3,
    categoriesCount: 4,
    brandsCount: 2,
    avgMarginPercent: 28.5
  };

  const sampleProducts: ProductDoc[] = [
    {
      id: 'prd-1',
      name: 'A2 Cow Cultured Ghee 500ml',
      sku: 'GHEE-500',
      barcode: '8901234567890',
      category: 'Dairy',
      brand: 'VC Organic',
      supplier: 'Farm Direct',
      purchasePrice: 350,
      sellingPrice: 500,
      gst: 12,
      unit: 'bottle',
      sellingMode: 'packaged',
      type: 'OWN',
      status: 'active'
    },
    {
      id: 'prd-2',
      name: 'Organic Raw Honey 500g',
      sku: 'HONEY-500',
      barcode: '8901234567891',
      category: 'Pantry',
      brand: 'VC Organic',
      supplier: 'Honey Guild',
      purchasePrice: 220,
      sellingPrice: 320,
      gst: 5,
      unit: 'bottle',
      sellingMode: 'packaged',
      type: 'OWN',
      status: 'active'
    }
  ];

  it('1. ProductHeader renders authoritative title and action buttons', () => {
    const handleCreate = jest.fn();
    const handleImport = jest.fn();

    render(
      <ProductHeader
        canCreate={true}
        canImport={true}
        onOpenCreate={handleCreate}
        onOpenImport={handleImport}
      />
    );

    expect(screen.getByText('Product Master Catalog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add product sku/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulk import/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add product sku/i }));
    expect(handleCreate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /bulk import/i }));
    expect(handleImport).toHaveBeenCalledTimes(1);
  });

  it('2. ProductSummaryCards renders 4 metric cards accurately', () => {
    render(<ProductSummaryCards metrics={sampleMetrics} isLoading={false} />);

    expect(screen.getByText('Total Active SKUs')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('10 Own / 5 Ext')).toBeInTheDocument();
    expect(screen.getByText('12 Pack / 3 Loose')).toBeInTheDocument();
    expect(screen.getByText('28.5%')).toBeInTheDocument();
  });

  it('3. ProductFilters triggers filter updates and reset', () => {
    const handleFilterChange = jest.fn();
    const handleReset = jest.fn();

    render(
      <ProductFilters
        filters={{
          search: 'Ghee',
          category: 'Dairy',
          brand: 'all',
          type: 'all',
          sellingMode: 'all',
          status: 'active'
        }}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        categories={['Dairy', 'Pantry', 'Produce']}
        brands={['VC Organic', 'Amul']}
        totalResults={2}
      />
    );

    expect(screen.getByDisplayValue('Ghee')).toBeInTheDocument();
    expect(screen.getByText(/2/)).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /reset filters/i });
    fireEvent.click(resetBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('4. ProductTable renders product items and actions', () => {
    const handleInspect = jest.fn();
    const handleEdit = jest.fn();
    const handleArchive = jest.fn();

    render(
      <ProductTable
        products={sampleProducts}
        isLoading={false}
        canEdit={true}
        canArchive={true}
        onInspect={handleInspect}
        onEdit={handleEdit}
        onArchive={handleArchive}
      />
    );

    expect(screen.getByText('A2 Cow Cultured Ghee 500ml')).toBeInTheDocument();
    expect(screen.getByText('GHEE-500')).toBeInTheDocument();
    expect(screen.getByText('8901234567890')).toBeInTheDocument();
    expect(screen.getByText('₹500.00')).toBeInTheDocument();

    const inspectBtn = screen.getByLabelText(/inspect a2 cow cultured ghee 500ml/i);
    fireEvent.click(inspectBtn);
    expect(handleInspect).toHaveBeenCalledTimes(1);
  });
});
