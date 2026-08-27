import { apiClient } from '../../lib/api/client';
import type { AuditLogDoc, AuditQueryParams } from './types';

type AuditLogsResponse =
  | AuditLogDoc[]
  | { success?: boolean; auditLogs?: AuditLogDoc[]; data?: AuditLogDoc[]; results?: AuditLogDoc[]; error?: unknown }
  | null
  | undefined;

export function normalizeAuditLogsResponse(response: AuditLogsResponse): AuditLogDoc[] {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== 'object') return [];

  if (Array.isArray(response.auditLogs)) return response.auditLogs;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.results)) return response.results;

  if ('success' in response && response.success === false) {
    return [];
  }

  throw new Error('Malformed audit log response: expected a raw array or an object containing auditLogs.');
}

export const auditApi = {
  /**
   * Fetch immutable audit logs
   * GET /api/v1/audit-logs
   */
  async getAuditLogs(params: AuditQueryParams = {}): Promise<AuditLogDoc[]> {
    const query = new URLSearchParams();

    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.skip !== undefined) query.set('skip', String(params.skip));
    if (params.eventType && params.eventType !== 'ALL') query.set('eventType', params.eventType);
    if (params.entity && params.entity !== 'ALL') query.set('entity', params.entity);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.storeId && params.storeId !== 'all') query.set('storeId', params.storeId);

    const queryString = query.toString();
    const endpoint = queryString ? `/api/v1/audit-logs?${queryString}` : '/api/v1/audit-logs';

    const res = await apiClient.get<AuditLogsResponse>(endpoint);
    return normalizeAuditLogsResponse(res);
  }
};
