import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  FranchiseHeader,
  FranchiseSummaryCards,
  FranchiseTable,
  SupplyOrderTable,
  FranchiseDeleteDialog
} from '../../features/franchises/components';
import type { FranchiseDoc, FranchiseSupplyOrderDoc } from '../../features/franchises/types';

describe('Franchise UI Components Suite', () => {
  const mockFranchise: FranchiseDoc = {
    id: 'fran-1',
    name: 'VC Organics Thane',
    location: 'Thane West',
    owner: 'Vikram Shinde',
    phone: '9876543210',
    email: 'thane@vcorganic.com',
    gstin: '27AAAAA0000A1Z5',
    status: 'active',
    supplyList: [
      {
        productId: 'p1',
        name: 'A2 Ghee 1L',
        supplyPrice: 500,
        retailPrice: 750,
        isCustom: false
      }
    ],
    createdAt: new Date().toISOString()
  };

  const mockSupplyOrder: FranchiseSupplyOrderDoc = {
    id: 'fso-1',
    franchiseId: 'fran-1',
    date: '2026-08-17',
    items: [
      {
        productId: 'p1',
        name: 'A2 Ghee 1L',
        qty: 10,
        supplyPrice: 500,
        gst: 5,
        isCustom: false
      }
    ],
    subtotal: 5000,
    tax: 250,
    grandTotal: 5250,
    paymentStatus: 'paid',
    notes: 'Morning batch dispatch',
    createdAt: new Date().toISOString()
  };

  it('1. FranchiseHeader renders title, count and management buttons', () => {
    const onRegister = jest.fn();
    const onCreateSupply = jest.fn();

    render(
      <FranchiseHeader
        totalFranchises={3}
        activeFranchises={2}
        canManage={true}
        onRegisterFranchise={onRegister}
        onCreateSupplyOrder={onCreateSupply}
      />
    );

    expect(screen.getByText('Franchise CRM & Supply Chain')).toBeInTheDocument();
    expect(screen.getByText('3 Registered (2 Active)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Add Franchise'));
    expect(onRegister).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Record Supply Order'));
    expect(onCreateSupply).toHaveBeenCalledTimes(1);
  });

  it('2. FranchiseSummaryCards renders calculated earnings and receivables', () => {
    const metrics = {
      totalFranchises: 3,
      activeFranchises: 2,
      totalSupplyOrders: 5,
      totalEarnings: 25000,
      pendingReceivables: 5000
    };

    render(<FranchiseSummaryCards metrics={metrics} />);

    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('₹25,000')).toBeInTheDocument();
    expect(screen.getByText('₹5,000')).toBeInTheDocument();
  });

  it('3. FranchiseTable renders partner details and dispatches action callbacks', () => {
    const onView = jest.fn();
    const onSupply = jest.fn();
    const onEdit = jest.fn();
    const onDelete = jest.fn();

    render(
      <FranchiseTable
        franchises={[mockFranchise]}
        isLoading={false}
        canManage={true}
        onViewDetail={onView}
        onRecordSupply={onSupply}
        onEditFranchise={onEdit}
        onDeleteFranchise={onDelete}
      />
    );

    expect(screen.getByText('VC Organics Thane')).toBeInTheDocument();
    expect(screen.getByText('Vikram Shinde')).toBeInTheDocument();
    expect(screen.getByText('27AAAAA0000A1Z5')).toBeInTheDocument();
    expect(screen.getByText('1 Product')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('View franchise details for VC Organics Thane'));
    expect(onView).toHaveBeenCalledWith(mockFranchise);

    fireEvent.click(screen.getByLabelText('Record supply dispatch for VC Organics Thane'));
    expect(onSupply).toHaveBeenCalledWith(mockFranchise);

    fireEvent.click(screen.getByLabelText('Edit franchise VC Organics Thane'));
    expect(onEdit).toHaveBeenCalledWith(mockFranchise);

    fireEvent.click(screen.getByLabelText('Delete franchise VC Organics Thane'));
    expect(onDelete).toHaveBeenCalledWith(mockFranchise);
  });

  it('4. SupplyOrderTable renders dispatched orders and status badge', () => {
    render(
      <SupplyOrderTable
        orders={[mockSupplyOrder]}
        franchises={[mockFranchise]}
        isLoading={false}
      />
    );

    expect(screen.getByText('fso-1')).toBeInTheDocument();
    expect(screen.getByText('VC Organics Thane')).toBeInTheDocument();
    expect(screen.getByText('₹5,250')).toBeInTheDocument();
    expect(screen.getByText('PAID')).toBeInTheDocument();
    expect(screen.getByText('Morning batch dispatch')).toBeInTheDocument();
  });

  it('5. FranchiseDeleteDialog confirms partner deletion', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();

    render(
      <FranchiseDeleteDialog
        isOpen={true}
        onClose={onClose}
        franchise={mockFranchise}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Delete Franchise Partner')).toBeInTheDocument();
    expect(screen.getByText('VC Organics Thane')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirm Deletion'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
