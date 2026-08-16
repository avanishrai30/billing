import { realtimeManager } from '../../lib/realtime/socket';

describe('Realtime Store Scope Room Subscription Suite', () => {
  beforeEach(() => {
    realtimeManager.disconnect();
  });

  it('1. joinStore cleans previous store rooms and adds new target room', () => {
    // Join Store 1
    realtimeManager.joinStore('store-1');
    expect((realtimeManager as any).joinedRooms.has('store_store-1')).toBe(true);

    // Switch to Store 2 -> store-1 should be cleaned up
    realtimeManager.joinStore('store-2');
    expect((realtimeManager as any).joinedRooms.has('store_store-2')).toBe(true);
    expect((realtimeManager as any).joinedRooms.has('store_store-1')).toBe(false);

    // Switch to 'all' -> all store rooms should be cleaned up
    realtimeManager.joinStore('all');
    expect((realtimeManager as any).joinedRooms.has('store_store-2')).toBe(false);
    expect((realtimeManager as any).joinedRooms.has('store_store-1')).toBe(false);
  });

  it('2. Repeated switching between Store A and Store B does not accumulate duplicate rooms', () => {
    for (let i = 0; i < 5; i++) {
      realtimeManager.joinStore('store-A');
      expect((realtimeManager as any).joinedRooms.size).toBe(1);
      expect((realtimeManager as any).joinedRooms.has('store_store-A')).toBe(true);

      realtimeManager.joinStore('store-B');
      expect((realtimeManager as any).joinedRooms.size).toBe(1);
      expect((realtimeManager as any).joinedRooms.has('store_store-B')).toBe(true);
    }
  });
});
