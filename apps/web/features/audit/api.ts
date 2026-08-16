import { apiClient } from '../../lib/api/client';
import type { AuditLogDoc, AuditQueryParams } from './types';

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

    const res = await apiClient.get<AuditLogDoc[] | { success: boolean; auditLogs: AuditLogDoc[] }>(endpoint);

    if (Array.isArray(res)) return res;
    if (res && 'auditLogs' in res && Array.isArray(res.auditLogs)) return res.auditLogs;
    return [];
  }
};
