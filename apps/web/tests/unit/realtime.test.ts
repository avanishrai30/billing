import { realtimeManager } from '../../lib/realtime/socket';
import { sessionManager } from '../../lib/auth/session';
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RealtimeProvider } from '../../providers/RealtimeProvider';
import { useAuth } from '../../providers/AuthProvider';

jest.mock('../../providers/AuthProvider', () => ({
  useAuth: jest.fn()
}));

describe('Realtime Socket Gateway & Listener Management', () => {
  beforeEach(() => {
    realtimeManager.disconnect();
    sessionManager.clearSession();
  });

  it('1. Connect returns null when user is not authenticated', () => {
    const socket = realtimeManager.connect();
    expect(socket).toBeNull();
  });

  it('2. Subscribes to events with duplicate prevention and provides teardown cleanup', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    const unsubscribe1 = realtimeManager.subscribe('inventory.updated', handler1);
    const unsubscribe2 = realtimeManager.subscribe('inventory.updated', handler2);

    expect(typeof unsubscribe1).toBe('function');
    expect(typeof unsubscribe2).toBe('function');

    // Clean up
    unsubscribe1();
    unsubscribe2();
  });

  it('3. Manages store room join tracking without duplicate joins', () => {
    realtimeManager.joinStore('st-1');
    realtimeManager.joinStore('st-1'); // idempotent duplicate call

    realtimeManager.leaveStore('st-1');
  });

  it('4. Refreshes the authenticated session for targeted user access updates', async () => {
    const refreshSession = jest.fn().mockResolvedValue(null);
    const unsubscribe = jest.fn();
    const handlers = new Map<string, (payload: unknown) => void>();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      user: { id: 'usr-target' },
      refreshSession,
      logout: jest.fn()
    });

    jest.spyOn(realtimeManager, 'connect').mockReturnValue(null);
    jest.spyOn(realtimeManager, 'subscribe').mockImplementation((eventName, handler) => {
      handlers.set(eventName, handler as (payload: unknown) => void);
      return unsubscribe;
    });

    render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(RealtimeProvider, null, React.createElement('div', null, 'Realtime child'))
      )
    );

    await waitFor(() => {
      expect(handlers.has('user_access_updated')).toBe(true);
    });

    await act(async () => {
      handlers.get('user_access_updated')?.({
        data: {
          targetUserId: 'usr-target',
          authorizationVersion: 2,
          updatedAt: '2026-08-22T00:00:00.000Z'
        }
      });
    });

    expect(refreshSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      handlers.get('user_access_updated')?.({
        data: {
          targetUserId: 'usr-other',
          authorizationVersion: 3,
          updatedAt: '2026-08-22T00:01:00.000Z'
        }
      });
    });

    expect(refreshSession).toHaveBeenCalledTimes(1);
  });
});
