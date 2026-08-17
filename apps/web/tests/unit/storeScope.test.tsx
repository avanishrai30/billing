import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { StoreScopeProvider, useStoreScope } from '../../providers/StoreScopeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useStoresQuery } from '../../features/stores/hooks';
import { realtimeManager } from '../../lib/realtime/socket';

jest.mock('../../hooks/useAuth');
jest.mock('../../features/stores/hooks');
jest.mock('../../lib/realtime/socket', () => ({
  realtimeManager: {
    joinStore: jest.fn(),
    leaveStore: jest.fn()
  }
}));

function ScopeConsumer() {
  const {
    activeStoreId,
    isAllStores,
    isRestricted,
    switchStore,
    scope,
    stores
  } = useStoreScope();

  return (
    <div>
      <div data-testid="active-store">{activeStoreId}</div>
      <div data-testid="is-all">{isAllStores ? 'yes' : 'no'}</div>
      <div data-testid="is-restricted">{isRestricted ? 'yes' : 'no'}</div>
      <div data-testid="scope-mode">{scope.mode}</div>
      <div data-testid="stores-count">{stores.length}</div>
      <button onClick={() => switchStore('store-2')}>Switch to Store 2</button>
      <button onClick={() => switchStore('all')}>Switch to All</button>
    </div>
  );
}

describe('StoreScopeProvider & useStoreScope Unit Suite', () => {
  const mockStoresList = [
    { id: 'store-1', name: 'Store 1', code: 'ST-01', status: 'active' },
    { id: 'store-2', name: 'Store 2', code: 'ST-02', status: 'active' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useStoresQuery as jest.Mock).mockReturnValue({
      data: mockStoresList,
      isLoading: false
    });
  });

  it('1. Super Admin with assignedStoreId "all" defaults to all stores scope and can switch', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id: 'u1',
        role: 'SUPER ADMIN',
        category: 'super admin',
        assignedStoreId: 'all'
      }
    });

    render(
      <StoreScopeProvider>
        <ScopeConsumer />
      </StoreScopeProvider>
    );

    expect(screen.getByTestId('is-restricted')).toHaveTextContent('no');

    // Switch to Store 2
    act(() => {
      screen.getByText('Switch to Store 2').click();
    });

    expect(screen.getByTestId('active-store')).toHaveTextContent('store-2');
    expect(screen.getByTestId('is-all')).toHaveTextContent('no');
    expect(screen.getByTestId('scope-mode')).toHaveTextContent('store');
    expect(realtimeManager.joinStore).toHaveBeenCalledWith('store-2');

    // Switch back to All Stores
    act(() => {
      screen.getByText('Switch to All').click();
    });

    expect(screen.getByTestId('active-store')).toHaveTextContent('all');
    expect(screen.getByTestId('is-all')).toHaveTextContent('yes');
    expect(screen.getByTestId('scope-mode')).toHaveTextContent('all');
  });

  it('2. Assigned user is restricted to assignedStoreId and cannot switch away', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id: 'u2',
        role: 'CASHIER',
        category: 'cashier',
        assignedStoreId: 'store-1'
      }
    });

    render(
      <StoreScopeProvider>
        <ScopeConsumer />
      </StoreScopeProvider>
    );

    expect(screen.getByTestId('is-restricted')).toHaveTextContent('yes');
    expect(screen.getByTestId('active-store')).toHaveTextContent('store-1');

    // Attempting to switch to store-2 should be rejected
    act(() => {
      screen.getByText('Switch to Store 2').click();
    });

    expect(screen.getByTestId('active-store')).toHaveTextContent('store-1');
    expect(warnSpy).toHaveBeenCalledWith(
      '[StoreScope] Restricted user cannot switch away from assigned store: store-1'
    );
    warnSpy.mockRestore();
  });

  it('3. Invalid or non-existent store ID in localStorage automatically falls back to "all"', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('aiavro_selected_store_id', 'non-existent-store-999');

    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id: 'u1',
        role: 'SUPER ADMIN',
        category: 'super admin',
        assignedStoreId: 'all'
      }
    });

    act(() => {
      render(
        <StoreScopeProvider>
          <ScopeConsumer />
        </StoreScopeProvider>
      );
    });

    // After render and stores validation effect, should fall back to 'all'
    expect(screen.getByTestId('active-store')).toHaveTextContent('all');
    expect(screen.getByTestId('is-all')).toHaveTextContent('yes');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
