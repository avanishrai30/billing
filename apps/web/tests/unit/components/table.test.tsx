import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  EmptyState,
  Pagination,
  Skeleton
} from '../../../components/ui';

describe('UI Primitives: Table, Pagination & Empty State', () => {
  it('1. Renders Table with tabular numeric cells and header columns', () => {
    render(
      <Table density="dense">
        <TableHeader>
          <tr>
            <TableHead>SKU</TableHead>
            <TableHead isNumeric>Price</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          <TableRow isInteractive>
            <TableCell>Ghee 500ml</TableCell>
            <TableCell isNumeric>₹ 650.00</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByText('SKU')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Ghee 500ml')).toBeInTheDocument();
    expect(screen.getByText('₹ 650.00')).toBeInTheDocument();
  });

  it('2. EmptyState renders title, description, and action button', () => {
    const handleAction = jest.fn();
    render(
      <EmptyState
        title="No Orders"
        description="No orders match your query"
        actionLabel="Create Order"
        onAction={handleAction}
      />
    );

    expect(screen.getByText('No Orders')).toBeInTheDocument();
    expect(screen.getByText('No orders match your query')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /create order/i });
    fireEvent.click(btn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('3. Pagination handles page transitions and disabled boundaries', () => {
    const handlePageChange = jest.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={handlePageChange}
      />
    );

    expect(screen.getByText(/showing/i)).toBeInTheDocument();
    const prevBtn = screen.getByRole('button', { name: /previous/i });
    const nextBtn = screen.getByRole('button', { name: /next/i });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('4. Skeleton renders placeholder', () => {
    render(<Skeleton width="100px" height="20px" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });
});
