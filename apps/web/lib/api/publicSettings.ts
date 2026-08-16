import { apiClient } from './client';

export interface PublicSettings {
  title: string;
  logo: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  database: 'connected' | 'disconnected';
  uptime?: string;
}

export const publicApi = {
  /**
   * Fetches public branding settings (no auth required)
   * GET /api/v1/public/settings
   */
  async getPublicSettings(): Promise<PublicSettings> {
    return apiClient.get<PublicSettings>('/api/v1/public/settings', { skipAuth: true });
  },

  /**
   * Fetches backend process and database health status
   * GET /health
   */
  async getHealth(): Promise<HealthCheckResponse> {
    return apiClient.get<HealthCheckResponse>('/health', { skipAuth: true, timeout: 5000 });
  }
};
