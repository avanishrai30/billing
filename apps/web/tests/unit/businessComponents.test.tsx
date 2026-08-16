import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  BusinessHeader,
  BusinessProfileCard
} from '../../features/businesses/components';
import type { BusinessDoc } from '../../features/businesses/types';

describe('Business Component Layer Unit Suite', () => {
  const sampleBusiness: BusinessDoc = {
    id: 'biz-1',
    name: 'VC Organic Billing Pvt Ltd',
    subtitle: 'Pure Organic Dairy & Farm Produce',
    owner: 'Avanish Rai',
    gstin: '27AAAAA0000A1Z5',
    phone: '9876543210',
    email: 'admin@vcorganic.com',
    address: '102 Green Acres, Bandra West, Mumbai',
    bankName: 'HDFC Bank Ltd',
    accountNo: '50200012345678',
    ifsc: 'HDFC0000123',
    upiId: 'vcorganic@hdfcbank',
    status: 'active'
  };

  it('1. BusinessHeader renders title and edit button', () => {
    const handleEdit = jest.fn();

    render(
      <BusinessHeader
        canEdit={true}
        onOpenEdit={handleEdit}
      />
    );

    expect(screen.getByText('Business & Legal Entity Profile')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /edit business profile/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleEdit).toHaveBeenCalledTimes(1);
  });

  it('2. BusinessProfileCard renders legal name, GSTIN, address, and banking info', () => {
    render(<BusinessProfileCard business={sampleBusiness} isLoading={false} />);

    expect(screen.getByText('VC Organic Billing Pvt Ltd')).toBeInTheDocument();
    expect(screen.getByText('27AAAAA0000A1Z5')).toBeInTheDocument();
    expect(screen.getByText('Avanish Rai')).toBeInTheDocument();
    expect(screen.getByText('102 Green Acres, Bandra West, Mumbai')).toBeInTheDocument();
    expect(screen.getByText('HDFC Bank Ltd')).toBeInTheDocument();
    expect(screen.getByText(/vcorganic@hdfcbank/i)).toBeInTheDocument();
  });
});
