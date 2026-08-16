'use client';

import { useQuery } from '@tanstack/react-query';
import { taxApi, type TaxReportSourceData } from './api';

export const taxQueryKeys = {
  all: ['tax-reports'] as const,
  sourceData: (params?: { storeId?: string; startDate?: string; endDate?: string }) =>
    ['tax-reports', 'source-data', params || {}] as const
};

export function useTaxSourceDataQuery(params: {
  storeId?: string;
  startDate?: string;
  endDate?: string;
} = {}) {
  return useQuery<TaxReportSourceData>({
    queryKey: taxQueryKeys.sourceData(params),
    queryFn: () => taxApi.getTaxSourceData(params),
    staleTime: 60 * 1000
  });
}
