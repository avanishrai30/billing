import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { POSHeader, ProductCard } from '../../features/pos/components';
import type { POSProduct } from '../../features/pos/types';

describe('POS Location-Aware Inventory & Multi-Store UI Suite', () => {
  const mockStores = [
    { id: 'wh-main', name: 'Central Warehouse', isWarehouse: true, locationType: 'WAREHOUSE' },
    { id: 'st-srs', name: 'VC Organic SRS', isWarehouse: false, locationType: 'STORE' },
    { id: 'st-temple', name: 'VC Organic Temple Stall', isWarehouse: false, locationType: 'STORE' }
  ];

  describe('POSHeader Location Selector & Lock', () => {
    it('1. Renders locked store badge for store-restricted cashiers', () => {
      const handleSelect = jest.fn();

      render(
        <POSHeader
          storeName="VC Organic SRS"
          cashierName="Cashier Ramesh"
          itemCount={0}
          stores={mockStores}
          selectedLocationId="st-srs"
          onSelectLocation={handleSelect}
          isLocationLocked={true}
        />
      );

      expect(screen.getByText('Selling From:')).toBeInTheDocument();
      expect(screen.getByTestId('pos-active-location-name')).toHaveTextContent('VC Organic SRS');
      expect(screen.queryByTestId('pos-location-select')).not.toBeInTheDocument();
    });

    it('2. Renders selectable dropdown for global/Super Admin users filtering out warehouses', () => {
      const handleSelect = jest.fn();

      render(
        <POSHeader
          storeName="VC Organic SRS"
          cashierName="Super Admin"
          itemCount={0}
          stores={mockStores}
          selectedLocationId="st-srs"
          onSelectLocation={handleSelect}
          isLocationLocked={false}
        />
      );

      const select = screen.getByTestId('pos-location-select') as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      expect(select.value).toBe('st-srs');

      // Should only include retail stores (st-srs, st-temple), excluding central warehouse
      const options = Array.from(select.options).map((o) => o.value);
      expect(options).toEqual(['st-srs', 'st-temple']);
      expect(options).not.toContain('wh-main');

      // Change location
      fireEvent.change(select, { target: { value: 'st-temple' } });
      expect(handleSelect).toHaveBeenCalledWith('st-temple');
    });
  });

  describe('ProductCard Location-Specific Stock Display & Guards', () => {
    const productWithStock: POSProduct = {
      id: 'prod-ghee',
      name: 'A2 Vedic Bilona Ghee 1L',
      sku: 'GHEE-1L',
      price: 1200,
      stock: 5,
      inventory: 5,
      available: 5,
      locationId: 'st-srs'
    };

    const outOfStockProduct: POSProduct = {
      id: 'prod-honey',
      name: 'Wild Forest Honey 500g',
      sku: 'HONEY-500',
      price: 450,
      stock: 0,
      inventory: 0,
      available: 0,
      locationId: 'st-srs'
    };

    it('3. Displays available stock badge and enables Add button when stock > 0', () => {
      const handleAdd = jest.fn();

      render(
        <ProductCard
          product={productWithStock}
          onAddToCart={handleAdd}
          cartQuantity={0}
        />
      );

      expect(screen.getByText('Stock: 5')).toBeInTheDocument();
      const addBtn = screen.getByRole('button', { name: /add a2 vedic bilona ghee 1l to cart/i });
      expect(addBtn).not.toBeDisabled();
      expect(addBtn).toHaveTextContent(/add/i);

      fireEvent.click(addBtn);
      expect(handleAdd).toHaveBeenCalledWith(productWithStock);
    });

    it('4. Displays Out of Stock and disables Add button when stock <= 0, keeping card visible', () => {
      const handleAdd = jest.fn();

      render(
        <ProductCard
          product={outOfStockProduct}
          onAddToCart={handleAdd}
          cartQuantity={0}
        />
      );

      // Card is fully visible
      expect(screen.getByText('Wild Forest Honey 500g')).toBeInTheDocument();
      expect(screen.getByText('Stock: 0')).toBeInTheDocument();

      // Add button is disabled with "Out of Stock"
      const addBtn = screen.getByRole('button', { name: /out of stock/i });
      expect(addBtn).toBeDisabled();

      fireEvent.click(addBtn);
      expect(handleAdd).not.toHaveBeenCalled();
    });

    it('5. Stepper disables increment button when reaching available stock limit', () => {
      const handleIncrement = jest.fn();

      render(
        <ProductCard
          product={productWithStock}
          onAddToCart={jest.fn()}
          onIncrement={handleIncrement}
          cartQuantity={5} // Already added 5 out of 5 available
        />
      );

      expect(screen.getByText('Stock: 5')).toBeInTheDocument();
      expect(screen.getByText('5 in cart')).toBeInTheDocument();

      const incBtn = screen.getByRole('button', { name: /increase quantity/i });
      expect(incBtn).toBeDisabled();

      fireEvent.click(incBtn);
      expect(handleIncrement).not.toHaveBeenCalled();
    });
  });

  describe('Location Switch Guard with Non-Empty Cart', () => {
    // Harness component reflecting POS page switch outlet logic
    function LocationSwitchHarness({ initialCartCount = 0 }: { initialCartCount?: number }) {
      const [cartCount, setCartCount] = React.useState(initialCartCount);
      const [activeLoc, setActiveLoc] = React.useState('st-srs');
      const [pendingLoc, setPendingLoc] = React.useState<string | null>(null);
      const [isModalOpen, setIsModalOpen] = React.useState(false);

      const handleLocationChange = (newLocId: string) => {
        if (newLocId === activeLoc) return;
        if (cartCount > 0) {
          setPendingLoc(newLocId);
          setIsModalOpen(true);
          return;
        }
        setActiveLoc(newLocId);
      };

      const handleConfirmSwitch = () => {
        if (pendingLoc) {
          setCartCount(0);
          setActiveLoc(pendingLoc);
          setPendingLoc(null);
          setIsModalOpen(false);
        }
      };

      return (
        <div>
          <POSHeader
            storeName={activeLoc === 'st-srs' ? 'VC Organic SRS' : 'VC Organic Temple Stall'}
            cashierName="Admin"
            itemCount={cartCount}
            stores={mockStores}
            selectedLocationId={activeLoc}
            onSelectLocation={handleLocationChange}
            isLocationLocked={false}
          />
          <div data-testid="cart-count">Cart Items: {cartCount}</div>
          <div data-testid="active-location">Active Location: {activeLoc}</div>

          {isModalOpen && (
            <div role="dialog" aria-label="Switch Sales Outlet?">
              <h3>Switch Sales Outlet?</h3>
              <p>Your current cart contains {cartCount} item(s). Switching will clear the cart.</p>
              <button onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button onClick={handleConfirmSwitch}>Clear Cart & Switch Outlet</button>
            </div>
          )}
        </div>
      );
    }

    it('6. When cart is empty, switches location immediately without prompt', () => {
      render(<LocationSwitchHarness initialCartCount={0} />);

      const select = screen.getByTestId('pos-location-select');
      fireEvent.change(select, { target: { value: 'st-temple' } });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByTestId('active-location')).toHaveTextContent('st-temple');
    });

    it('7. When cart has items, blocks switch, opens confirmation dialog, and allows cancellation', () => {
      render(<LocationSwitchHarness initialCartCount={2} />);

      const select = screen.getByTestId('pos-location-select');
      fireEvent.change(select, { target: { value: 'st-temple' } });

      // Dialog is open, active location unchanged, cart unchanged
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('active-location')).toHaveTextContent('st-srs');
      expect(screen.getByTestId('cart-count')).toHaveTextContent('Cart Items: 2');

      // Cancel button clicked
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByTestId('active-location')).toHaveTextContent('st-srs');
      expect(screen.getByTestId('cart-count')).toHaveTextContent('Cart Items: 2');
    });

    it('8. When user confirms switch, clears cart and updates active location', () => {
      render(<LocationSwitchHarness initialCartCount={3} />);

      const select = screen.getByTestId('pos-location-select');
      fireEvent.change(select, { target: { value: 'st-temple' } });

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Confirm switch
      fireEvent.click(screen.getByText('Clear Cart & Switch Outlet'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByTestId('active-location')).toHaveTextContent('st-temple');
      expect(screen.getByTestId('cart-count')).toHaveTextContent('Cart Items: 0');
    });
  });
});
