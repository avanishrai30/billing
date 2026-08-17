/**
 * Authoritative Domain Types for Settings & Configuration
 * Based on verified backend endpoints:
 * - GET /api/v1/public/settings
 * - POST /api/v1/settings
 * - GET /api/v1/stores
 * - POST /api/v1/stores
 * - POST /api/v1/upload?type=logos
 */

export interface PublicSettingsDoc {
  title: string;
  logo: string;
}

export interface SaveBrandingPayload {
  title: string;
  logo: string;
}

export interface UploadLogoResponse {
  success: boolean;
  imagePath: string;
  imageId: string;
}

export interface StoreProfileFormValues {
  name: string;
  subtitle?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  upiId?: string;
  address?: string;
  logo?: string;
  invoicePrefix?: string;
  currency?: string;
  isActive?: boolean;
  inventoryAlertThreshold?: number;
}

export type SettingsTabId = 'branding' | 'business' | 'preferences';

export interface VisualPreferences {
  showProductImages: boolean;
}
