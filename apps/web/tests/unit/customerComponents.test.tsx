import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  CustomerHeader,
  CustomerSummaryCards,
  CustomerFilters,
  CustomerTable
} from '../../features/customers/components';
import type { CustomerDoc, CustomerSummaryMetrics } from '../../features/customers/types';

describe('Customer Component Layer Unit Suite', () => {
  const sampleMetrics: CustomerSummaryMetrics = {
    totalCustomers: 120,
    withGstinCount: 45,
    withEmailCount: 80
  };

  const sampleCustomers: CustomerDoc[] = [
    {
      id: 'cust-1',
      name: 'Avanish Rai',
      phone: '9876543210',
      email: 'avanish@example.com',
      gstin: '27AAAAA0000A1Z5',
      address: 'Mumbai, India'
    },
    {
      id: 'cust-2',
      name: 'Rohan Sharma',
      phone: '9876543211',
      email: '',
      gstin: '',
      address: 'Pune, India'
    }
  ];

  it('1. CustomerHeader renders title, description, and register button', () => {
    const handleCreate = jest.fn();

    render(
      <CustomerHeader
        canCreate={true}
        onOpenCreate={handleCreate}
      />
    );

    expect(screen.getByText('Customer CRM Directory')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /register customer/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleCreate).toHaveBeenCalledTimes(1);
  });

  it('2. CustomerSummaryCards renders 3 metric cards with formatted numbers', () => {
    render(<CustomerSummaryCards metrics={sampleMetrics} isLoading={false} />);

    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('3. CustomerFilters handles search input and reset trigger', () => {
    const handleSearch = jest.fn();
    const handleClear = jest.fn();

    render(
      <CustomerFilters
        searchQuery="Avanish"
        onSearchChange={handleSearch}
        onClearFilters={handleClear}
      />
    );

    expect(screen.getByDisplayValue('Avanish')).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('4. CustomerTable renders rows with phone, GSTIN badge, and action buttons', () => {
    const handleView = jest.fn();
    const handleEdit = jest.fn();
    const handleDelete = jest.fn();

    render(
      <CustomerTable
        customers={sampleCustomers}
        isLoading={false}
        canEdit={true}
        canDelete={true}
        onViewDetail={handleView}
        onEditCustomer={handleEdit}
        onDeleteCustomer={handleDelete}
      />
    );

    expect(screen.getByText('Avanish Rai')).toBeInTheDocument();
    expect(screen.getByText('Rohan Sharma')).toBeInTheDocument();
    expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
    expect(screen.getByText('27AAAAA0000A1Z5')).toBeInTheDocument();
    expect(screen.getByText('Unregistered')).toBeInTheDocument();

    const viewBtn = screen.getByRole('button', {
      name: /view history and details for avanish rai/i
    });
    fireEvent.click(viewBtn);
    expect(handleView).toHaveBeenCalledTimes(1);

    const editBtn = screen.getByRole('button', {
      name: /edit profile for avanish rai/i
    });
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledTimes(1);

    const deleteBtn = screen.getByRole('button', {
      name: /delete customer avanish rai/i
    });
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledTimes(1);
  });
});
