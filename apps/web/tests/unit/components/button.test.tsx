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

  it('4. Locks shared icon and text alignment contracts', () => {
    render(
      <>
        <Button size="sm" leftIcon={<svg data-testid="upload-icon" />}>
          Upload Custom Logo
        </Button>
        <Button size="md" leftIcon={<svg data-testid="save-icon" />}>
          Save Branding Settings
        </Button>
        <Button size="md" leftIcon={<svg data-testid="refresh-icon" className="h-5 w-5" />}>
          Refresh
        </Button>
        <Button size="lg" rightIcon={<svg data-testid="edit-icon" />}>
          Edit
        </Button>
        <IconButton aria-label="Add" size="md" icon={<svg data-testid="add-icon" />} />
      </>
    );

    const upload = screen.getByRole('button', { name: 'Upload Custom Logo' });
    const save = screen.getByRole('button', { name: 'Save Branding Settings' });
    const edit = screen.getByRole('button', { name: 'Edit' });
    const add = screen.getByRole('button', { name: 'Add' });

    expect(upload).toHaveClass(
      'inline-flex',
      'flex-row',
      'flex-nowrap',
      'items-center',
      'justify-center',
      'leading-none',
      'whitespace-nowrap',
      'h-8',
      'gap-1.5'
    );
    expect(save).toHaveClass('h-9', 'gap-2');
    expect(edit).toHaveClass('h-[42px]', 'gap-2');
    expect(add).toHaveClass(
      'inline-flex',
      'flex-row',
      'flex-nowrap',
      'items-center',
      'justify-center',
      'leading-none',
      'w-9',
      'h-9'
    );

    const saveIconSlot = screen.getByTestId('save-icon').parentElement;
    expect(saveIconSlot).toHaveClass(
      'inline-flex',
      'items-center',
      'justify-center',
      'shrink-0',
      'leading-none',
      '[&>svg]:block',
      '[&>svg]:shrink-0',
      '[&>svg]:!h-4',
      '[&>svg]:!w-4'
    );

    expect(screen.getByTestId('upload-icon').parentElement).toHaveClass('[&>svg]:!h-3.5', '[&>svg]:!w-3.5');
    expect(screen.getByTestId('edit-icon').parentElement).toHaveClass('[&>svg]:!h-[18px]', '[&>svg]:!w-[18px]');
    expect(screen.getByTestId('add-icon').parentElement).toHaveClass('[&>svg]:!h-4', '[&>svg]:!w-4');

    expect(save.querySelector('[data-button-icon-slot="left"]')).toBe(saveIconSlot);
    expect(save.querySelector('[data-button-label="true"]')).toHaveClass(
      'inline-flex',
      'items-center',
      'leading-none',
      'truncate'
    );
    expect(save.querySelector('[data-button-label="true"]')).toHaveTextContent('Save Branding Settings');
  });
});
