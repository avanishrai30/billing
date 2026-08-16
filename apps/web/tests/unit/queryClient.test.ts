import { createQueryClient } from '../../lib/query/queryClient';
import { queryKeys } from '../../lib/query/keys';
import { ApiError } from '../../lib/errors/types';

describe('TanStack Query Configuration & Key Factory', () => {
  it('1. Generates deterministic query keys', () => {
    expect(queryKeys.products()).toEqual(['products', undefined]);
    expect(queryKeys.product('prod-123')).toEqual(['products', 'prod-123']);
    expect(queryKeys.inventory('st-1')).toEqual(['inventory', 'st-1', undefined]);
    expect(queryKeys.dashboardMetrics('st-1')).toEqual(['dashboard-metrics', 'st-1']);
    expect(queryKeys.publicSettings()).toEqual(['public-settings']);
  });

  it('2. QueryClient defaultOptions configure anti-retry policy for 4xx ApiErrors', () => {
    const client = createQueryClient();
    const defaultQueries = client.getDefaultOptions().queries;

    expect(defaultQueries?.staleTime).toBe(30000);
    expect(defaultQueries?.refetchOnWindowFocus).toBe(false);

    const retryFn = defaultQueries?.retry as (failureCount: number, error: any) => boolean;

    const notFoundError = new ApiError({ message: 'Not found', status: 404, code: 'NOT_FOUND' });
    const serverError = new ApiError({ message: 'Server error', status: 500, code: 'SERVER_ERROR' });

    // 404 should never retry
    expect(retryFn(1, notFoundError)).toBe(false);
    // 500 can retry once
    expect(retryFn(1, serverError)).toBe(true);
    expect(retryFn(2, serverError)).toBe(false);
  });
});
