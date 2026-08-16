import { publicApi } from '../../lib/api/publicSettings';
import { apiClient } from '../../lib/api/client';

describe('Public Settings & Health API Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. Fetches public branding settings without auth token requirement', async () => {
    const mockSettings = {
      title: 'AIAVRO Business OS',
      logo: 'transparent logo aiavro.png'
    };

    jest.spyOn(apiClient, 'get').mockResolvedValue(mockSettings);

    const result = await publicApi.getPublicSettings();
    expect(result).toEqual(mockSettings);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/public/settings', { skipAuth: true });
  });

  it('2. Fetches backend health check status', async () => {
    const mockHealth = {
      status: 'healthy' as const,
      database: 'connected' as const,
      uptime: '3600s'
    };

    jest.spyOn(apiClient, 'get').mockResolvedValue(mockHealth);

    const result = await publicApi.getHealth();
    expect(result).toEqual(mockHealth);
    expect(apiClient.get).toHaveBeenCalledWith('/health', { skipAuth: true, timeout: 5000 });
  });
});
