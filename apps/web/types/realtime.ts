/**
 * Authoritative Socket.IO Realtime Types & Envelopes
 * Source: docs/REALTIME_CONTRACTS_FREEZE.md
 */

export interface RealtimeEnvelope<T = Record<string, any>> {
  eventId: string;
  entity: string;
  action: string;
  entityId: string;
  locationId: string | null;
  version: number;
  timestamp: string;
  data: T;
}

export type RealtimeRoom = `store_${string}` | 'sync_global' | string;

export interface ScannerProductPayload {
  product: Record<string, any>;
}

export interface ScannerNotFoundPayload {
  barcode: string;
}
