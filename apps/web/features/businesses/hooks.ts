'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessesApi } from './api';
import { useRealtime } from '../../hooks/useRealtime';
import type { BusinessFormPayload } from './types';

export const businessQueryKeys = {
  all: ['businesses'] as const,
  list: () => ['businesses', 'list'] as const,
  detail: (id: string) => ['business', id] as const
};

export function useBusinessesQuery() {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: businessQueryKeys.list(),
    queryFn: () => businessesApi.getBusinesses(),
    staleTime: 60 * 1000
  });

  useEffect(() => {
    const unsubUpdated = subscribe('business_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    });

    const unsubDeleted = subscribe('business_deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    });

    return () => {
      unsubUpdated();
      unsubDeleted();
    };
  }, [subscribe, queryClient]);

  return query;
}

export function useBusinessDetailQuery(id?: string) {
  return useQuery({
    queryKey: businessQueryKeys.detail(id || ''),
    queryFn: () => businessesApi.getBusinessById(id!),
    enabled: !!id,
    staleTime: 60 * 1000
  });
}

export function useCreateBusinessMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BusinessFormPayload) => businessesApi.createBusiness(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      if (res.business?.id) {
        queryClient.invalidateQueries({ queryKey: ['business', res.business.id] });
      }
    }
  });
}

export function useUpdateBusinessMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<BusinessFormPayload> }) =>
      businessesApi.updateBusiness(id, payload),
    onSuccess: (res, variables) => {
      if (res.business) {
        const updateBusinessList = (current: any) => {
          if (!Array.isArray(current)) return current;
          return current.map((business) =>
            business.id === variables.id ? { ...business, ...res.business } : business
          );
        };
        queryClient.setQueryData(businessQueryKeys.list(), updateBusinessList);
        queryClient.setQueriesData({ queryKey: ['businesses'] }, updateBusinessList);
        queryClient.setQueryData(businessQueryKeys.detail(variables.id), res.business);
      }
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['business', variables.id] });
    }
  });
}

export function useDeleteBusinessMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => businessesApi.deleteBusiness(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.removeQueries({ queryKey: ['business', id] });
    }
  });
}
