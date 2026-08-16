import { apiClient } from '../../lib/api/client';
import { DashboardMetricsResponseSchema } from './schemas';
import type { DashboardMetricsResponse } from './types';

export const dashboardApi = {
  getMetrics: async (storeId?: string): Promise<DashboardMetricsResponse> => {
    const params = storeId && storeId !== 'all' ? { storeId } : undefined;
    const rawData = await apiClient.get<unknown>('/api/v1/dashboard/metrics', { params });
    const parsed = DashboardMetricsResponseSchema.parse(rawData);
    return parsed as DashboardMetricsResponse;
  }
};
