import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  SupplierHeader,
  SupplierSummaryCards,
  SupplierFilters,
  SupplierTable
} from '../../features/suppliers/components';
import type { SupplierDoc, SupplierSummaryMetrics } from '../../features/suppliers/types';

describe('Supplier Component Layer Unit Suite', () => {
  const sampleMetrics: SupplierSummaryMetrics = {
    totalSuppliers: 15,
    withGstCount: 12,
    withEmailCount: 10
  };

  const sampleSuppliers: SupplierDoc[] = [
    {
      id: 'sup-1',
      name: 'Golden Ghee Co.',
      contact: '9876543210',
      email: 'orders@goldenghee.com',
      gst: '27AAAAA0000A1Z5',
      address: 'Gujarat, India'
    },
    {
      id: 'sup-2',
      name: 'Pure Dairy Products',
      contact: '9876543211',
      email: '',
      gst: '',
      address: 'Pune, India'
    }
  ];

  it('1. SupplierHeader renders title, description, and register button', () => {
    const handleCreate = jest.fn();

    render(
      <SupplierHeader
        canCreate={true}
        onOpenCreate={handleCreate}
      />
    );

    expect(screen.getByText('Supplier & Vendor Directory')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /register supplier/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleCreate).toHaveBeenCalledTimes(1);
  });

  it('2. SupplierSummaryCards renders 3 metric cards with formatted numbers', () => {
    render(<SupplierSummaryCards metrics={sampleMetrics} isLoading={false} />);

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('3. SupplierFilters handles search input and reset trigger', () => {
    const handleSearch = jest.fn();
    const handleClear = jest.fn();

    render(
      <SupplierFilters
        searchQuery="Golden"
        onSearchChange={handleSearch}
        onClearFilters={handleClear}
      />
    );

    expect(screen.getByDisplayValue('Golden')).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('4. SupplierTable renders rows with contact, GSTIN badge, and action buttons', () => {
    const handleView = jest.fn();
    const handleEdit = jest.fn();
    const handleDelete = jest.fn();

    render(
      <SupplierTable
        suppliers={sampleSuppliers}
        isLoading={false}
        canEdit={true}
        canDelete={true}
        onViewDetail={handleView}
        onEditSupplier={handleEdit}
        onDeleteSupplier={handleDelete}
      />
    );

    expect(screen.getByText('Golden Ghee Co.')).toBeInTheDocument();
    expect(screen.getByText('Pure Dairy Products')).toBeInTheDocument();
    expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
    expect(screen.getByText('27AAAAA0000A1Z5')).toBeInTheDocument();
    expect(screen.getByText('Unregistered')).toBeInTheDocument();

    const viewBtn = screen.getByRole('button', {
      name: /view history and details for golden ghee co\./i
    });
    fireEvent.click(viewBtn);
    expect(handleView).toHaveBeenCalledTimes(1);

    const editBtn = screen.getByRole('button', {
      name: /edit profile for golden ghee co\./i
    });
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledTimes(1);

    const deleteBtn = screen.getByRole('button', {
      name: /delete supplier golden ghee co\./i
    });
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledTimes(1);
  });
});
