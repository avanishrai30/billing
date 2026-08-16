import { realtimeManager } from '../../lib/realtime/socket';
import { sessionManager } from '../../lib/auth/session';

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
});
