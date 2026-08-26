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
 * Custom hook for workstation printer, media profile and thermal sensor preferences.
 */
export function usePrinterLabelPreferences() {
  const [selectedProfileId, setSelectedProfileIdState] = useState<string>(DEFAULT_LABEL_PROFILE_ID);
  const [customProfile, setCustomProfileState] = useState<LabelProfile>(CUSTOM_LABEL_PROFILE);
  const [printerName, setPrinterNameState] = useState<string>('TVS LP-46 Dlite');
  const [printerType, setPrinterTypeState] = useState<string>('TVS Electronics');
  const [printerModelId, setPrinterModelIdState] = useState<string>('tvs_lp46_dlite');
  const [printerLanguage, setPrinterLanguageState] = useState<'TSPL' | 'TSPL-EZ' | 'ZPL' | 'EPL' | 'BROWSER'>('TSPL-EZ');
  const [mediaType, setMediaTypeState] = useState<'DIE_CUT' | 'CONTINUOUS' | 'BLACK_MARK'>('DIE_CUT');
  const [sensorMode, setSensorModeState] = useState<'GAP' | 'BLACK_MARK' | 'CONTINUOUS'>('GAP');
  const [gapMm, setGapMmState] = useState<number>(2);
  const [xOffsetMm, setXOffsetMmState] = useState<number>(0);
  const [yOffsetMm, setYOffsetMmState] = useState<number>(0);
  const [printAgentUrl, setPrintAgentUrlState] = useState<string>('http://127.0.0.1:9123');
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
          printerModelId?: string;
          printerLanguage?: 'TSPL' | 'TSPL-EZ' | 'ZPL' | 'EPL' | 'BROWSER';
          mediaType?: 'DIE_CUT' | 'CONTINUOUS' | 'BLACK_MARK';
          sensorMode?: 'GAP' | 'BLACK_MARK' | 'CONTINUOUS';
          gapMm?: number;
          xOffsetMm?: number;
          yOffsetMm?: number;
          printAgentUrl?: string;
        };
        if (parsed.selectedProfileId) setSelectedProfileIdState(parsed.selectedProfileId);
        if (parsed.customProfile) {
          setCustomProfileState(normalizeLabelProfile({ ...CUSTOM_LABEL_PROFILE, ...parsed.customProfile }));
        }
        if (parsed.printerName) setPrinterNameState(parsed.printerName);
        if (parsed.printerType) setPrinterTypeState(parsed.printerType);
        if (parsed.printerModelId) setPrinterModelIdState(parsed.printerModelId);
        if (parsed.printerLanguage) setPrinterLanguageState(parsed.printerLanguage);
        if (parsed.mediaType) setMediaTypeState(parsed.mediaType);
        if (parsed.sensorMode) setSensorModeState(parsed.sensorMode);
        if (parsed.gapMm !== undefined) setGapMmState(Number(parsed.gapMm));
        if (parsed.xOffsetMm !== undefined) setXOffsetMmState(Number(parsed.xOffsetMm));
        if (parsed.yOffsetMm !== undefined) setYOffsetMmState(Number(parsed.yOffsetMm));
        if (parsed.printAgentUrl) setPrintAgentUrlState(parsed.printAgentUrl);
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
    printerModelId?: string;
    printerLanguage?: 'TSPL' | 'TSPL-EZ' | 'ZPL' | 'EPL' | 'BROWSER';
    mediaType?: 'DIE_CUT' | 'CONTINUOUS' | 'BLACK_MARK';
    sensorMode?: 'GAP' | 'BLACK_MARK' | 'CONTINUOUS';
    gapMm?: number;
    xOffsetMm?: number;
    yOffsetMm?: number;
    printAgentUrl?: string;
  }) => {
    try {
      localStorage.setItem(LABEL_PROFILE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  }, []);

  const rawSelectedProfile = selectedProfileId === 'custom'
    ? customProfile
    : getLabelProfileById(selectedProfileId);

  const selectedProfile: LabelProfile = {
    ...rawSelectedProfile,
    manufacturer: printerType,
    model: printerName,
    printerLanguage,
    mediaType,
    sensorMode,
    gapMm,
    xOffsetMm,
    yOffsetMm
  };

  const updatePreferences = useCallback((updates: Partial<{
    selectedProfileId: string;
    customProfile: LabelProfile;
    printerName: string;
    printerType: string;
    printerModelId: string;
    printerLanguage: 'TSPL' | 'TSPL-EZ' | 'ZPL' | 'EPL' | 'BROWSER';
    mediaType: 'DIE_CUT' | 'CONTINUOUS' | 'BLACK_MARK';
    sensorMode: 'GAP' | 'BLACK_MARK' | 'CONTINUOUS';
    gapMm: number;
    xOffsetMm: number;
    yOffsetMm: number;
    printAgentUrl: string;
  }>) => {
    const nextSelectedId = updates.selectedProfileId ?? selectedProfileId;
    const nextCustom = updates.customProfile ?? customProfile;
    const nextName = updates.printerName ?? printerName;
    const nextType = updates.printerType ?? printerType;
    const nextModelId = updates.printerModelId ?? printerModelId;
    const nextLang = updates.printerLanguage ?? printerLanguage;
    const nextMedia = updates.mediaType ?? mediaType;
    const nextSensor = updates.sensorMode ?? sensorMode;
    const nextGap = updates.gapMm ?? gapMm;
    const nextXOffset = updates.xOffsetMm ?? xOffsetMm;
    const nextYOffset = updates.yOffsetMm ?? yOffsetMm;
    const nextAgentUrl = updates.printAgentUrl ?? printAgentUrl;

    if (updates.selectedProfileId !== undefined) setSelectedProfileIdState(nextSelectedId);
    if (updates.customProfile !== undefined) setCustomProfileState(nextCustom);
    if (updates.printerName !== undefined) setPrinterNameState(nextName);
    if (updates.printerType !== undefined) setPrinterTypeState(nextType);
    if (updates.printerModelId !== undefined) setPrinterModelIdState(nextModelId);
    if (updates.printerLanguage !== undefined) setPrinterLanguageState(nextLang);
    if (updates.mediaType !== undefined) setMediaTypeState(nextMedia);
    if (updates.sensorMode !== undefined) setSensorModeState(nextSensor);
    if (updates.gapMm !== undefined) setGapMmState(nextGap);
    if (updates.xOffsetMm !== undefined) setXOffsetMmState(nextXOffset);
    if (updates.yOffsetMm !== undefined) setYOffsetMmState(nextYOffset);
    if (updates.printAgentUrl !== undefined) setPrintAgentUrlState(nextAgentUrl);

    persist({
      selectedProfileId: nextSelectedId,
      customProfile: nextCustom,
      printerName: nextName,
      printerType: nextType,
      printerModelId: nextModelId,
      printerLanguage: nextLang,
      mediaType: nextMedia,
      sensorMode: nextSensor,
      gapMm: nextGap,
      xOffsetMm: nextXOffset,
      yOffsetMm: nextYOffset,
      printAgentUrl: nextAgentUrl
    });
  }, [
    customProfile,
    gapMm,
    mediaType,
    persist,
    printAgentUrl,
    printerLanguage,
    printerModelId,
    printerName,
    printerType,
    selectedProfileId,
    sensorMode,
    xOffsetMm,
    yOffsetMm
  ]);

  const setSelectedProfileId = useCallback((nextId: string) => {
    updatePreferences({ selectedProfileId: nextId });
  }, [updatePreferences]);

  const setCustomProfile = useCallback((nextProfile: LabelProfile) => {
    const normalized = normalizeLabelProfile({
      ...CUSTOM_LABEL_PROFILE,
      ...nextProfile,
      id: 'custom',
      name: 'Custom'
    });
    updatePreferences({ customProfile: normalized });
  }, [updatePreferences]);

  const setPrinterName = useCallback((nextName: string) => {
    updatePreferences({ printerName: nextName });
  }, [updatePreferences]);

  const setPrinterType = useCallback((nextType: string) => {
    updatePreferences({ printerType: nextType });
  }, [updatePreferences]);

  return {
    selectedProfileId,
    selectedProfile: normalizeLabelProfile(selectedProfile),
    customProfile,
    printerName,
    printerType,
    printerModelId,
    printerLanguage,
    mediaType,
    sensorMode,
    gapMm,
    xOffsetMm,
    yOffsetMm,
    printAgentUrl,
    setSelectedProfileId,
    setCustomProfile,
    setPrinterName,
    setPrinterType,
    updatePreferences,
    isLoaded
  };
}
