import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ProductCard,
  CategoryBar,
  ProductSearch,
  CartItem,
  CartTotals,
  PaymentPanel
} from '../../features/pos/components';
import type { POSProduct, POSCartItem, POSTotals } from '../../features/pos/types';

describe('POS Component Layer & Interaction Unit Suite', () => {
  const sampleProduct: POSProduct = {
    id: 'prod-101',
    name: 'Organic Cow Ghee 500ml',
    sku: 'GHEE-500',
    price: 350,
    unit: 'jar',
    gst: 5,
    category: 'Dairy'
  };

  it('1. ProductCard renders product information and triggers onAddToCart', () => {
    const handleAdd = jest.fn();

    render(
      <ProductCard
        product={sampleProduct}
        onAddToCart={handleAdd}
        cartQuantity={0}
      />
    );

    expect(screen.getByText('Organic Cow Ghee 500ml')).toBeInTheDocument();
    expect(screen.getByText(/GHEE-500/)).toBeInTheDocument();
    expect(screen.getByText(/₹350.00/)).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /add organic cow ghee 500ml to cart/i });
    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);
    expect(handleAdd).toHaveBeenCalledWith(sampleProduct);
  });

  it('1b. ProductCard keeps long titles, large prices, and Add action in stable columns', () => {
    const longProduct: POSProduct = {
      ...sampleProduct,
      id: 'prod-long-price',
      name: 'Organic A2 Gir Cow Cultured Ghee Premium 1 Litre Jar',
      price: 12000,
      sellingPrice: 12000,
      unit: '1 litre jars'
    };

    render(
      <ProductCard
        product={longProduct}
        onAddToCart={jest.fn()}
        cartQuantity={0}
      />
    );

    expect(screen.getByText(longProduct.name)).toHaveClass('line-clamp-3', 'min-h-[3rem]');
    expect(screen.getByText(/₹12,000.00/)).toHaveClass('whitespace-nowrap');

    const addBtn = screen.getByRole('button', { name: /add organic a2 gir cow cultured ghee premium 1 litre jar to cart/i });
    expect(addBtn).toHaveClass('w-[72px]', 'h-8', 'shrink-0', 'justify-center');
  });

  it('2. CategoryBar renders all categories and handles selection', () => {
    const handleSelect = jest.fn();
    const categories = ['Dairy', 'Bakery', 'Beverages'];

    render(
      <CategoryBar
        categories={categories}
        selectedCategory="Dairy"
        onSelectCategory={handleSelect}
      />
    );

    expect(screen.getByText('All Products')).toBeInTheDocument();
    expect(screen.getByText('Dairy')).toBeInTheDocument();
    expect(screen.getByText('Bakery')).toBeInTheDocument();

    const bakeryTab = screen.getByRole('tab', { name: 'Bakery' });
    fireEvent.click(bakeryTab);
    expect(handleSelect).toHaveBeenCalledWith('Bakery');
  });

  it('3. ProductSearch renders input and clear button', () => {
    const handleChange = jest.fn();

    render(
      <ProductSearch
        value="Ghee"
        onChange={handleChange}
      />
    );

    expect(screen.getByDisplayValue('Ghee')).toBeInTheDocument();
    const clearBtn = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearBtn);
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('4. CartItem triggers increment, decrement, and remove actions', () => {
    const item: POSCartItem = {
      productId: 'prod-101',
      name: 'Organic Cow Ghee 500ml',
      unit: 'jar',
      price: 350,
      cost: 250,
      gst: 5,
      quantity: 2,
      discountPercent: 0,
      discountAmount: 0,
      taxableValue: 700,
      taxAmount: 35,
      lineTotal: 735
    };

    const handleIncrement = jest.fn();
    const handleDecrement = jest.fn();
    const handleRemove = jest.fn();

    render(
      <CartItem
        item={item}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        onRemove={handleRemove}
        onUpdateDiscount={jest.fn()}
      />
    );

    expect(screen.getByText('Organic Cow Ghee 500ml')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    const incBtn = screen.getByRole('button', { name: /increase quantity/i });
    fireEvent.click(incBtn);
    expect(handleIncrement).toHaveBeenCalledTimes(1);

    const decBtn = screen.getByRole('button', { name: /decrease quantity/i });
    fireEvent.click(decBtn);
    expect(handleDecrement).toHaveBeenCalledTimes(1);

    const removeBtn = screen.getByRole('button', { name: /remove organic cow ghee 500ml from cart/i });
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });

  it('5. CartTotals displays formatted totals in INR', () => {
    const totals: POSTotals = {
      subtotal: 1000,
      itemDiscountTotal: 50,
      cartDiscount: 20,
      taxableTotal: 930,
      taxTotal: 46.5,
      grandTotal: 976.5
    };

    render(<CartTotals totals={totals} />);

    expect(screen.getByText(/₹ 1,000.00/)).toBeInTheDocument();
    expect(screen.getByText(/- ₹ 70.00/)).toBeInTheDocument();
    expect(screen.getByText(/₹ 976.50/)).toBeInTheDocument();
  });

  it('6. PaymentPanel renders checkout dialog and modes', () => {
    const totals: POSTotals = {
      subtotal: 500,
      itemDiscountTotal: 0,
      cartDiscount: 0,
      taxableTotal: 500,
      taxTotal: 25,
      grandTotal: 525
    };

    render(
      <PaymentPanel
        isOpen={true}
        onClose={jest.fn()}
        totals={totals}
        customer={null}
        itemCount={1}
        onConfirmPayment={jest.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText(/pos settlement & checkout/i)).toBeInTheDocument();
    expect(screen.getByText('Cash Tender')).toBeInTheDocument();
    expect(screen.getByText('UPI / QR')).toBeInTheDocument();
    expect(screen.getByText('Card Swipe')).toBeInTheDocument();
  });
});
