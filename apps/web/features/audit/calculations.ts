import type { AuditLogDoc, AuditSummaryMetrics } from './types';

export const SENSITIVE_FIELD_KEYS = [
  'password',
  'passwordhash',
  'token',
  'secret',
  'currentpassword',
  'newpassword',
  'jwt',
  'authorization'
];

/**
 * Checks if a key name matches any known sensitive credential pattern
 */
export function isSensitiveKey(key: string): boolean {
  if (!key) return false;
  const lower = key.toLowerCase();
  return SENSITIVE_FIELD_KEYS.some((s) => lower === s || lower.includes(s));
}

/**
 * Recursively deep-redacts sensitive fields from objects or arrays for client display
 */
export function redactSensitivePayload(payload: any, seen = new WeakSet()): any {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload !== 'object') return payload;

  // Circular reference defense
  if (seen.has(payload)) {
    return '[Circular]';
  }
  seen.add(payload);

  if (Array.isArray(payload)) {
    return payload.map((item) => redactSensitivePayload(item, seen));
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (isSensitiveKey(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitivePayload(value, seen);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export interface FieldDiff {
  key: string;
  before: any;
  after: any;
  isChanged: boolean;
  isAdded: boolean;
  isRemoved: boolean;
}

/**
 * Generates field-by-field diff between sanitized before & after state snapshots
 */
export function calculatePayloadDiff(beforeRaw?: Record<string, any>, afterRaw?: Record<string, any>): FieldDiff[] {
  const before = redactSensitivePayload(beforeRaw || {});
  const after = redactSensitivePayload(afterRaw || {});

  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
  const diffs: FieldDiff[] = [];

  for (const key of allKeys) {
    const hasBefore = key in before;
    const hasAfter = key in after;
    const valBefore = before[key];
    const valAfter = after[key];

    const strBefore = JSON.stringify(valBefore);
    const strAfter = JSON.stringify(valAfter);

    const isAdded = !hasBefore && hasAfter;
    const isRemoved = hasBefore && !hasAfter;
    const isChanged = hasBefore && hasAfter && strBefore !== strAfter;

    if (isAdded || isRemoved || isChanged) {
      diffs.push({
        key,
        before: valBefore,
        after: valAfter,
        isChanged,
        isAdded,
        isRemoved
      });
    }
  }

  return diffs;
}

/**
 * Calculates high-level summary KPIs from audit logs list
 */
export function calculateAuditSummary(logs: AuditLogDoc[]): AuditSummaryMetrics {
  let authEvents = 0;
  let billingEvents = 0;
  let mutations = 0;
  let securityAlerts = 0;

  for (const log of logs) {
    if (log.action === 'auth') authEvents++;
    else if (log.action === 'billing') billingEvents++;
    else if (log.action === 'security' || log.eventType === 'AUTHORIZATION_DENIED') securityAlerts++;
    else if (['create', 'update', 'delete', 'transfer'].includes(log.action)) mutations++;
  }

  return {
    totalEvents: logs.length,
    authEvents,
    billingEvents,
    mutations,
    securityAlerts
  };
}
