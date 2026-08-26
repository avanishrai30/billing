import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  StoreHeader,
  StoreSummaryCards,
  StoreFilters,
  StoreTable
} from '../../features/stores/components';
import type { StoreDoc, StoreSummaryMetrics } from '../../features/stores/types';

describe('Store Component Layer Unit Suite', () => {
  const sampleMetrics: StoreSummaryMetrics = {
    totalStores: 5,
    activeStoresCount: 4,
    inactiveStoresCount: 1,
    hubStoresCount: 1
  };

  const sampleStores: StoreDoc[] = [
    {
      id: 'st-1',
      name: 'Mumbai Flagship',
      code: 'ST-MUM',
      address: 'Bandra West, Mumbai',
      phone: '022-26401234',
      status: 'active',
      isHub: false,
      employeeCount: 3
    },
    {
      id: 'st-2',
      name: 'Pune Branch',
      code: 'ST-PUN',
      address: 'Kalyani Nagar, Pune',
      phone: '020-25601234',
      status: 'inactive',
      isHub: true,
      employeeCount: 0
    }
  ];

  it('1. StoreHeader renders title and register button', () => {
    const handleCreate = jest.fn();

    render(
      <StoreHeader
        canCreate={true}
        onOpenCreate={handleCreate}
      />
    );

    expect(screen.getByText('Store & Branch Outlets')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /register store/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleCreate).toHaveBeenCalledTimes(1);
  });

  it('2. StoreSummaryCards renders metric cards with formatted numbers', () => {
    render(<StoreSummaryCards metrics={sampleMetrics} isLoading={false} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getAllByText('1')).toHaveLength(2);
  });

  it('3. StoreFilters handles search input and reset trigger', () => {
    const handleSearch = jest.fn();
    const handleClear = jest.fn();

    render(
      <StoreFilters
        searchQuery="Mumbai"
        onSearchChange={handleSearch}
        onClearFilters={handleClear}
      />
    );

    expect(screen.getByDisplayValue('Mumbai')).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('4. StoreTable renders rows with branch code, hub badges, and action triggers', () => {
    const handleEdit = jest.fn();
    const handleDelete = jest.fn();
    const handleManage = jest.fn();
    const handleToggleHub = jest.fn();

    render(
      <StoreTable
        stores={sampleStores}
        isLoading={false}
        canEdit={true}
        canDelete={true}
        isSuperAdmin={true}
        onEditStore={handleEdit}
        onDeleteStore={handleDelete}
        onManageEmployees={handleManage}
        onToggleHubStatus={handleToggleHub}
      />
    );

    expect(screen.getByText('Mumbai Flagship')).toBeInTheDocument();
    expect(screen.getByText('Pune Branch')).toBeInTheDocument();
    expect(screen.getByText('ST-MUM')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('INACTIVE')).toBeInTheDocument();
    expect(screen.getByText('DISTRIBUTION HUB')).toBeInTheDocument();

    const editBtn = screen.getByRole('button', {
      name: /edit store outlet mumbai flagship/i
    });
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledTimes(1);

    const deleteBtn = screen.getByRole('button', {
      name: /delete store outlet mumbai flagship/i
    });
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledTimes(1);
  });
});
