import { settingsApi } from '../../features/settings/api';
import { settingsQueryKeys } from '../../features/settings/hooks';
import { apiClient } from '../../lib/api/client';

jest.mock('../../lib/api/client');

describe('Settings API & Query Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. settingsQueryKeys returns correct cache keys', () => {
    expect(settingsQueryKeys.all).toEqual(['settings']);
    expect(settingsQueryKeys.public).toEqual(['public-settings']);
  });

  it('2. settingsApi.getPublicSettings calls GET /api/v1/public/settings', async () => {
    const mockRes = { title: 'VC Organics', logo: '/uploads/logos/logo.webp' };
    (apiClient.get as jest.Mock).mockResolvedValue(mockRes);

    const res = await settingsApi.getPublicSettings();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/public/settings');
    expect(res).toEqual(mockRes);
  });

  it('3. settingsApi.updatePortalSettings calls POST /api/v1/settings', async () => {
    const mockRes = { success: true, message: 'Settings saved successfully' };
    (apiClient.post as jest.Mock).mockResolvedValue(mockRes);

    const payload = { title: 'VC Organics OS', logo: '/uploads/logos/brand-logo.webp' };
    const res = await settingsApi.updatePortalSettings(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/settings', payload);
    expect(res).toEqual(mockRes);
  });

  it('4. settingsApi.uploadLogo calls POST /api/v1/upload?type=logos', async () => {
    const mockRes = { success: true, imagePath: '/uploads/logos/logo-1.webp', imageId: 'img-1' };
    (apiClient.post as jest.Mock).mockResolvedValue(mockRes);

    const res = await settingsApi.uploadLogo('logo.png', 'data:image/png;base64,1234');
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/upload?type=logos', {
      fileName: 'logo.png',
      base64Data: 'data:image/png;base64,1234'
    });
    expect(res).toEqual(mockRes);
  });

  it('5. settingsApi.updateStoreProfile calls POST /api/v1/stores with store ID', async () => {
    const mockRes = { id: 'store-1', name: 'Pune Outlet' };
    (apiClient.post as jest.Mock).mockResolvedValue(mockRes);

    const payload = { name: 'Pune Outlet', phone: '+91 99999 99999' };
    const res = await settingsApi.updateStoreProfile('store-1', payload);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/stores', {
      id: 'store-1',
      ...payload
    });
    expect(res).toEqual(mockRes);
  });
});
