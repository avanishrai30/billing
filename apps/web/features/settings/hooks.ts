import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from './api';
import type { SaveBrandingPayload, StoreProfileFormValues } from './types';
import { storeQueryKeys } from '../stores/hooks';
import {
  DEFAULT_LABEL_PROFILE_ID,
  LABEL_PROFILE_STORAGE_KEY,
  CUSTOM_LABEL_PROFILE,
  getLabelProfileById,
  normalizeLabelProfile,
  type LabelProfile
} from '../../lib/utils/labelProfiles';

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

/**
 * Custom hook for workstation printer and label media preferences.
 */
export function usePrinterLabelPreferences() {
  const [selectedProfileId, setSelectedProfileIdState] = useState<string>(DEFAULT_LABEL_PROFILE_ID);
  const [customProfile, setCustomProfileState] = useState<LabelProfile>(CUSTOM_LABEL_PROFILE);
  const [printerName, setPrinterNameState] = useState<string>('Generic Thermal Printer');
  const [printerType, setPrinterTypeState] = useState<string>('Generic Thermal');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LABEL_PROFILE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          selectedProfileId?: string;
          customProfile?: LabelProfile;
          printerName?: string;
          printerType?: string;
        };
        if (parsed.selectedProfileId) {
          setSelectedProfileIdState(parsed.selectedProfileId);
        }
        if (parsed.customProfile) {
          setCustomProfileState(normalizeLabelProfile({ ...CUSTOM_LABEL_PROFILE, ...parsed.customProfile }));
        }
        if (parsed.printerName) {
          setPrinterNameState(parsed.printerName);
        }
        if (parsed.printerType) {
          setPrinterTypeState(parsed.printerType);
        }
      }
    } catch {
      // Ignore localStorage exceptions in private browsing
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const persist = useCallback((next: {
    selectedProfileId: string;
    customProfile: LabelProfile;
    printerName: string;
    printerType: string;
  }) => {
    try {
      localStorage.setItem(LABEL_PROFILE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  }, []);

  const selectedProfile = selectedProfileId === 'custom'
    ? customProfile
    : getLabelProfileById(selectedProfileId);

  const setSelectedProfileId = useCallback((nextId: string) => {
    setSelectedProfileIdState(nextId);
    persist({
      selectedProfileId: nextId,
      customProfile,
      printerName,
      printerType
    });
  }, [customProfile, persist, printerName, printerType]);

  const setCustomProfile = useCallback((nextProfile: LabelProfile) => {
    const normalized = normalizeLabelProfile({ ...CUSTOM_LABEL_PROFILE, ...nextProfile, id: 'custom', name: 'Custom' });
    setCustomProfileState(normalized);
    persist({
      selectedProfileId,
      customProfile: normalized,
      printerName,
      printerType
    });
  }, [persist, printerName, printerType, selectedProfileId]);

  const setPrinterName = useCallback((nextName: string) => {
    setPrinterNameState(nextName);
    persist({
      selectedProfileId,
      customProfile,
      printerName: nextName,
      printerType
    });
  }, [customProfile, persist, printerType, selectedProfileId]);

  const setPrinterType = useCallback((nextType: string) => {
    setPrinterTypeState(nextType);
    persist({
      selectedProfileId,
      customProfile,
      printerName,
      printerType: nextType
    });
  }, [customProfile, persist, printerName, selectedProfileId]);

  return {
    selectedProfileId,
    selectedProfile: normalizeLabelProfile(selectedProfile),
    customProfile,
    printerName,
    printerType,
    setSelectedProfileId,
    setCustomProfile,
    setPrinterName,
    setPrinterType,
    isLoaded
  };
}
