import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, IconButton } from '../../../components/ui';

describe('UI Primitives: Button & IconButton', () => {
  it('1. Renders Button variants with proper accessible text', () => {
    render(<Button variant="primary">Submit Order</Button>);
    const btn = screen.getByRole('button', { name: /submit order/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('bg-blue-600');
  });

  it('2. Disables interaction and shows spinner when isLoading is true', () => {
    const handleClick = jest.fn();
    render(
      <Button isLoading onClick={handleClick}>
        Save Record
      </Button>
    );

    const btn = screen.getByRole('button', { name: /loading/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('3. Renders IconButton with required aria-label and triggers callback', () => {
    const handleClick = jest.fn();
    render(
      <IconButton
        aria-label="Delete line item"
        variant="danger"
        icon={<span data-testid="trash-icon">icon</span>}
        onClick={handleClick}
      />
    );

    const iconBtn = screen.getByRole('button', { name: /delete line item/i });
    expect(iconBtn).toBeInTheDocument();
    expect(screen.getByTestId('trash-icon')).toBeInTheDocument();

    fireEvent.click(iconBtn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
