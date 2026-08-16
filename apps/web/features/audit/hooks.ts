'use client';

import { useQuery } from '@tanstack/react-query';
import { auditApi } from './api';
import type { AuditQueryParams } from './types';

export const auditQueryKeys = {
  all: ['audit-logs'] as const,
  list: (params?: AuditQueryParams) => ['audit-logs', 'list', params || {}] as const
};

export function useAuditLogsQuery(params: AuditQueryParams = {}) {
  return useQuery({
    queryKey: auditQueryKeys.list(params),
    queryFn: () => auditApi.getAuditLogs(params),
    staleTime: 60 * 1000
  });
}
