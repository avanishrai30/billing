import { calculatePOSLine, calculatePOSTotals } from '../../features/pos/calculations';
import type { POSProduct, POSCartItem } from '../../features/pos/types';

describe('POS Local Cart State Transitions & Semantics', () => {
  const sampleProduct: POSProduct = {
    id: 'prod-001',
    name: 'A2 Cow Milk 1L',
    sku: 'MILK-1',
    price: 80,
    cost: 55,
    gst: 5,
    unit: 'bottle',
    stock: 50
  };

  it('1. Adds new product to empty cart with default quantity 1', () => {
    let cart: POSCartItem[] = [];

    const calc = calculatePOSLine({
      price: sampleProduct.price,
      quantity: 1,
      gst: sampleProduct.gst
    });

    cart = [
      ...cart,
      {
        productId: sampleProduct.id,
        name: sampleProduct.name,
        sku: sampleProduct.sku,
        unit: sampleProduct.unit || 'unit',
        price: sampleProduct.price,
        cost: sampleProduct.cost || 0,
        gst: sampleProduct.gst || 0,
        quantity: 1,
        discountPercent: 0,
        discountAmount: 0,
        stockAvailable: sampleProduct.stock,
        ...calc
      }
    ];

    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(1);
    expect(cart[0].lineTotal).toBe(84); // 80 + 4 (5% GST)
  });

  it('2. Adding duplicate product increments existing quantity rather than duplicating row', () => {
    let cart: POSCartItem[] = [
      {
        productId: sampleProduct.id,
        name: sampleProduct.name,
        unit: 'bottle',
        price: 80,
        cost: 55,
        gst: 5,
        quantity: 1,
        discountPercent: 0,
        discountAmount: 0,
        taxableValue: 80,
        taxAmount: 4,
        lineTotal: 84
      }
    ];

    // Simulate adding same product again
    const existingIdx = cart.findIndex((i) => i.productId === sampleProduct.id);
    expect(existingIdx).toBe(0);

    const newQty = cart[existingIdx].quantity + 1;
    const calc = calculatePOSLine({
      price: cart[existingIdx].price,
      quantity: newQty,
      gst: cart[existingIdx].gst
    });

    cart[existingIdx] = {
      ...cart[existingIdx],
      quantity: newQty,
      ...calc
    };

    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
    expect(cart[0].taxableValue).toBe(160);
    expect(cart[0].taxAmount).toBe(8);
    expect(cart[0].lineTotal).toBe(168);
  });

  it('3. Decrementing quantity at 1 removes item from cart', () => {
    let cart: POSCartItem[] = [
      {
        productId: sampleProduct.id,
        name: sampleProduct.name,
        unit: 'bottle',
        price: 80,
        cost: 55,
        gst: 5,
        quantity: 1,
        discountPercent: 0,
        discountAmount: 0,
        taxableValue: 80,
        taxAmount: 4,
        lineTotal: 84
      }
    ];

    // Decrement when qty is 1
    if (cart[0].quantity <= 1) {
      cart = cart.filter((i) => i.productId !== sampleProduct.id);
    }

    expect(cart).toHaveLength(0);
  });

  it('4. Removing item filters row cleanly', () => {
    let cart: POSCartItem[] = [
      {
        productId: 'prod-1',
        name: 'Item 1',
        unit: 'unit',
        price: 100,
        cost: 60,
        gst: 0,
        quantity: 1,
        discountPercent: 0,
        discountAmount: 0,
        taxableValue: 100,
        taxAmount: 0,
        lineTotal: 100
      },
      {
        productId: 'prod-2',
        name: 'Item 2',
        unit: 'unit',
        price: 200,
        cost: 120,
        gst: 0,
        quantity: 1,
        discountPercent: 0,
        discountAmount: 0,
        taxableValue: 200,
        taxAmount: 0,
        lineTotal: 200
      }
    ];

    cart = cart.filter((i) => i.productId !== 'prod-1');
    expect(cart).toHaveLength(1);
    expect(cart[0].productId).toBe('prod-2');
  });
});
