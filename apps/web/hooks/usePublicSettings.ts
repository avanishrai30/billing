'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { publicApi, type PublicSettings } from '../lib/api/publicSettings';
import { queryKeys } from '../lib/query/keys';
import { useRealtime } from './useRealtime';

const BRANDING_CACHE_KEY = 'aiavro_public_branding_cache';

function getCachedBranding(): PublicSettings | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.title === 'string') {
        return parsed;
      }
    }
  } catch {
    // Ignore cache read failures
  }
  return undefined;
}

export function usePublicSettings() {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: queryKeys.publicSettings(),
    queryFn: async () => {
      const res = await publicApi.getPublicSettings();
      if (typeof window !== 'undefined' && res && res.title) {
        try {
          localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(res));
        } catch {
          // Ignore cache write failures
        }
      }
      return res;
    },
    initialData: getCachedBranding,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Subscribe to real-time branding updates via Socket.IO
  useEffect(() => {
    const unsubscribe = subscribe<{ title?: string; logo?: string }>('settings_updated', (envelope) => {
      const updatedData = envelope.data || envelope;
      queryClient.setQueryData<PublicSettings>(queryKeys.publicSettings(), (old) => {
        const next: PublicSettings = {
          title: updatedData.title || old?.title || '',
          logo: updatedData.logo || old?.logo || ''
        };
        if (typeof window !== 'undefined' && next.title) {
          try {
            localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(next));
          } catch {
            // Ignore
          }
        }
        return next;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe, queryClient]);

  return query;
}
