import {
  calculateSupplyOrderTotals,
  calculateFranchiseMetrics
} from '../../features/franchises/calculations';
import type { FranchiseDoc, FranchiseSupplyOrderDoc } from '../../features/franchises/types';

describe('Franchise Calculations Unit Suite', () => {
  it('1. calculateSupplyOrderTotals accurately computes line total, tax and grand total', () => {
    const items = [
      {
        productId: 'p1',
        name: 'Organic Ghee 1L',
        qty: 5,
        supplyPrice: 500,
        gst: 5
      },
      {
        productId: 'p2',
        name: 'Cold Pressed Mustard Oil 1L',
        qty: 10,
        supplyPrice: 200,
        gst: 12
      }
    ];

    const result = calculateSupplyOrderTotals(items);

    // subtotal = (5*500) + (10*200) = 2500 + 2000 = 4500
    expect(result.subtotal).toBe(4500);

    // tax = (2500 * 0.05) + (2000 * 0.12) = 125 + 240 = 365
    expect(result.tax).toBe(365);

    // grandTotal = 4500 + 365 = 4865
    expect(result.grandTotal).toBe(4865);
  });

  it('2. calculateFranchiseMetrics summarizes active partners and paid vs pending earnings', () => {
    const mockFranchises: FranchiseDoc[] = [
      {
        id: 'fran-1',
        name: 'Thane Outlet',
        location: 'Thane',
        owner: 'Vikram',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'fran-2',
        name: 'Kalyan Outlet',
        location: 'Kalyan',
        owner: 'Ramesh',
        status: 'suspended',
        createdAt: new Date().toISOString()
      }
    ];

    const mockOrders: FranchiseSupplyOrderDoc[] = [
      {
        id: 'fso-1',
        franchiseId: 'fran-1',
        items: [],
        subtotal: 5000,
        tax: 250,
        grandTotal: 5250,
        paymentStatus: 'paid',
        createdAt: new Date().toISOString()
      },
      {
        id: 'fso-2',
        franchiseId: 'fran-2',
        items: [],
        subtotal: 3000,
        tax: 150,
        grandTotal: 3150,
        paymentStatus: 'pending',
        createdAt: new Date().toISOString()
      }
    ];

    const metrics = calculateFranchiseMetrics(mockFranchises, mockOrders);

    expect(metrics.totalFranchises).toBe(2);
    expect(metrics.activeFranchises).toBe(1);
    expect(metrics.totalSupplyOrders).toBe(2);
    expect(metrics.totalEarnings).toBe(5250);
    expect(metrics.pendingReceivables).toBe(3150);
  });
});
