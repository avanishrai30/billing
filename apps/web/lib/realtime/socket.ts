import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from '../api/client';
import { sessionManager } from '../auth/session';
import type { RealtimeEnvelope } from '../../types/realtime';

export type RealtimeEventHandler<T = any> = (envelope: RealtimeEnvelope<T>) => void;

class RealtimeSocketManager {
  private socket: Socket | null = null;
  private joinedRooms: Set<string> = new Set();
  private eventListeners: Map<string, Set<RealtimeEventHandler>> = new Map();
  private socketForwarders: Map<string, (data: RealtimeEnvelope<any>) => void> = new Map();

  private attachForwarder(eventName: string): void {
    if (!this.socket || this.socketForwarders.has(eventName)) return;
    const forwarder = (data: RealtimeEnvelope<any>) => {
      const handlers = this.eventListeners.get(eventName);
      if (handlers) {
        handlers.forEach(h => {
          try {
            h(data);
          } catch (e) {
            console.error(`[Realtime] Handler error for event '${eventName}':`, e);
          }
        });
      }
    };
    this.socketForwarders.set(eventName, forwarder);
    this.socket.on(eventName, forwarder);
  }

  private attachRegisteredForwarders(): void {
    this.eventListeners.forEach((_handlers, eventName) => {
      this.attachForwarder(eventName);
    });
  }

  /**
   * Connects to the Socket.IO server with JWT auth handshake.
   */
  public connect(): Socket | null {
    if (typeof window === 'undefined') return null;

    const token = sessionManager.getToken();
    if (!token) {
      this.disconnect();
      return null;
    }

    // In test environments with synthetic mock tokens, skip live socket connection
    if (token.startsWith('mock-') || token.startsWith('jwt-') || token === 'test-token') {
      return null;
    }

    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const baseUrl = getApiBaseUrl();

    this.socket = io(baseUrl, {
      auth: { token },
      query: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('[Realtime] Connected to backend gateway. Socket ID:', this.socket?.id);
      this.attachRegisteredForwarders();
      // Re-join active rooms on reconnect
      this.joinedRooms.forEach(room => {
        if (room.startsWith('store_')) {
          const storeId = room.replace('store_', '');
          this.socket?.emit('JOIN_SYNC', { storeId });
        } else if (room.startsWith('session_')) {
          const sessionId = room.replace('session_', '');
          this.socket?.emit('JOIN_SESSION', { sessionId });
        }
      });
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Realtime] Connection error:', err.message);
      if (
        err.message &&
        (err.message.includes('INVALID_TOKEN') ||
          err.message.includes('jwt') ||
          err.message.includes('unauthorized') ||
          err.message.includes('Authentication error'))
      ) {
        this.socket?.disconnect();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Realtime] Disconnected:', reason);
    });

    return this.socket;
  }

  /**
   * Disconnects and cleans up all active socket resources.
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.socketForwarders.clear();
    this.joinedRooms.clear();
    this.eventListeners.clear();
  }

  /**
   * Joins a store room idempotently (e.g. "store_st-1") and cleans up previous store rooms.
   */
  public joinStore(storeId: string): void {
    if (!storeId || storeId === 'all') {
      this.joinedRooms.forEach((room) => {
        if (room.startsWith('store_')) {
          this.joinedRooms.delete(room);
        }
      });
      return;
    }

    const targetRoom = `store_${storeId}`;
    this.joinedRooms.forEach((room) => {
      if (room.startsWith('store_') && room !== targetRoom) {
        this.joinedRooms.delete(room);
      }
    });

    if (this.joinedRooms.has(targetRoom)) return;

    this.joinedRooms.add(targetRoom);
    if (this.socket && this.socket.connected) {
      this.socket.emit('JOIN_SYNC', { storeId });
    }
  }

  /**
   * Leaves a store room.
   */
  public leaveStore(storeId: string): void {
    const room = `store_${storeId}`;
    this.joinedRooms.delete(room);
  }

  /**
   * Subscribes to a real-time event with automatic duplicate prevention and cleanup.
   */
  public subscribe<T = any>(eventName: string, handler: RealtimeEventHandler<T>): () => void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
      this.attachForwarder(eventName);
    }

    const handlers = this.eventListeners.get(eventName)!;
    handlers.add(handler as RealtimeEventHandler);

    // Return unsubscription teardown function
    return () => {
      handlers.delete(handler as RealtimeEventHandler);
      if (handlers.size === 0) {
        this.eventListeners.delete(eventName);
        const forwarder = this.socketForwarders.get(eventName);
        if (this.socket && forwarder) {
          this.socket.off(eventName, forwarder);
        }
        this.socketForwarders.delete(eventName);
      }
    };
  }

  /**
   * Dispatches an event directly to all registered in-process subscribers.
   * Useful for testing, offline dispatch, or synthesized bridge events.
   */
  public dispatch<T = any>(eventName: string, data: RealtimeEnvelope<T> | any): void {
    const handlers = this.eventListeners.get(eventName);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (e) {
          console.error(`[Realtime] Dispatch handler error for '${eventName}':`, e);
        }
      });
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }
}

export const realtimeManager = new RealtimeSocketManager();

if (typeof window !== 'undefined') {
  (window as any).__aiavro_realtime = realtimeManager;
}
