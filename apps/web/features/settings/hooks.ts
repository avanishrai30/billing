import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from './api';
import type { SaveBrandingPayload, StoreProfileFormValues } from './types';
import { storeQueryKeys } from '../stores/hooks';

export const settingsQueryKeys = {
  all: ['settings'] as const,
  public: ['public-settings'] as const
};

export const PREF_SHOW_PRODUCT_IMAGES_KEY = 'aiavro_pref_show_product_images';

/**
 * Hook to fetch public portal branding settings
 */
export function usePortalSettingsQuery() {
  return useQuery({
    queryKey: settingsQueryKeys.public,
    queryFn: () => settingsApi.getPublicSettings(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });
}

/**
 * Mutation to update portal branding settings
 */
export function useUpdatePortalSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveBrandingPayload) => settingsApi.updatePortalSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.public });
    }
  });
}

/**
 * Mutation to upload brand logo media asset
 */
export function useUploadLogoMutation() {
  return useMutation({
    mutationFn: ({ fileName, base64Data }: { fileName: string; base64Data: string }) =>
      settingsApi.uploadLogo(fileName, base64Data)
  });
}

/**
 * Mutation to update store / business profile settings
 */
export function useUpdateStoreProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, payload }: { storeId: string; payload: StoreProfileFormValues }) =>
      settingsApi.updateStoreProfile(storeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storeQueryKeys.all });
    }
  });
}

/**
 * Custom hook for local visual preferences (show product images)
 */
export function useVisualPreferences() {
  const [showProductImages, setShowProductImagesState] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREF_SHOW_PRODUCT_IMAGES_KEY);
      if (stored !== null) {
        setShowProductImagesState(stored === 'true');
      }
    } catch {
      // Ignore localStorage exceptions in private browsing
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const setShowProductImages = useCallback((val: boolean) => {
    setShowProductImagesState(val);
    try {
      localStorage.setItem(PREF_SHOW_PRODUCT_IMAGES_KEY, String(val));
    } catch {
      // Ignore
    }
  }, []);

  return {
    showProductImages,
    setShowProductImages,
    isLoaded
  };
}
