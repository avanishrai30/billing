import { apiClient } from '../../lib/api/client';
import type {
  PublicSettingsDoc,
  SaveBrandingPayload,
  UploadLogoResponse,
  StoreProfileFormValues
} from './types';
import type { StoreDoc } from '../stores/types';

export const settingsApi = {
  /**
   * Fetch public portal settings (unauthenticated)
   * GET /api/v1/public/settings
   */
  async getPublicSettings(): Promise<PublicSettingsDoc> {
    const res = await apiClient.get<PublicSettingsDoc>('/api/v1/public/settings');
    return res;
  },

  /**
   * Update global portal branding (Admin / Owner only)
   * POST /api/v1/settings
   */
  async updatePortalSettings(payload: SaveBrandingPayload): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<{ success: boolean; message: string }>('/api/v1/settings', payload);
    return res;
  },

  /**
   * Upload and optimize logo media asset (Admin / Owner / Manager)
   * POST /api/v1/upload?type=logos
   */
  async uploadLogo(fileName: string, base64Data: string): Promise<UploadLogoResponse> {
    const res = await apiClient.post<UploadLogoResponse>('/api/v1/upload?type=logos', {
      fileName,
      base64Data
    });
    return res;
  },

  /**
   * Update business / store profile attributes
   * POST /api/v1/stores
   */
  async updateStoreProfile(storeId: string, payload: StoreProfileFormValues): Promise<StoreDoc> {
    const res = await apiClient.post<StoreDoc>('/api/v1/stores', {
      id: storeId,
      ...payload
    });
    return res;
  }
};
