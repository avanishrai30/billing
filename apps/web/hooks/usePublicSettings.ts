'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { publicApi, type PublicSettings } from '../lib/api/publicSettings';
import { queryKeys } from '../lib/query/keys';
import { useRealtime } from './useRealtime';

export function usePublicSettings() {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: queryKeys.publicSettings(),
    queryFn: () => publicApi.getPublicSettings(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Subscribe to real-time branding updates via Socket.IO
  useEffect(() => {
    const unsubscribe = subscribe<{ title?: string; logo?: string }>('settings_updated', (envelope) => {
      const updatedData = envelope.data || envelope;
      queryClient.setQueryData<PublicSettings>(queryKeys.publicSettings(), (old) => ({
        title: updatedData.title || old?.title || 'AIAVRO Billing OS',
        logo: updatedData.logo || old?.logo || ''
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe, queryClient]);

  return query;
}
