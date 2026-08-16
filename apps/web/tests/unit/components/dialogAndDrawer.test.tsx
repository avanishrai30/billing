import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog, Drawer, Dropdown } from '../../../components/ui';

describe('UI Primitives: Dialog, Drawer & Dropdown Overlays', () => {
  it('1. Dialog opens, renders children, and closes on Escape or close button', () => {
    const handleClose = jest.fn();
    render(
      <Dialog isOpen={true} onClose={handleClose} title="Confirm Action">
        <p>Dialog body message</p>
      </Dialog>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Dialog body message')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Close dialog');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Escape key press
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('2. Drawer opens and renders content when isOpen is true', () => {
    const handleClose = jest.fn();
    render(
      <Drawer isOpen={true} onClose={handleClose} title="Drawer Details">
        <p>Drawer inner content</p>
      </Drawer>
    );

    expect(screen.getByText('Drawer Details')).toBeInTheDocument();
    expect(screen.getByText('Drawer inner content')).toBeInTheDocument();

    const backdrop = screen.getByTestId('drawer-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('3. Dropdown toggles menu list and executes selected item action', () => {
    const handleItemClick = jest.fn();
    render(
      <Dropdown
        trigger={<button>Options Menu</button>}
        items={[{ label: 'Export PDF', onClick: handleItemClick }]}
      />
    );

    const trigger = screen.getByText('Options Menu');
    fireEvent.click(trigger);

    const item = screen.getByText('Export PDF');
    expect(item).toBeInTheDocument();

    fireEvent.click(item);
    expect(handleItemClick).toHaveBeenCalledTimes(1);
  });
});
