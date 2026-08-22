import React from 'react';
import '@testing-library/jest-dom';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import { QueryProvider } from '../../providers/QueryProvider';
import { RealtimeProvider } from '../../providers/RealtimeProvider';
import { AuthProvider } from '../../providers/AuthProvider';
import { ToastProvider } from '../../components/ui/Toast';
import { publicApi } from '../../lib/api/publicSettings';
import { realtimeManager } from '../../lib/realtime/socket';

describe('Dynamic Branding & Socket.IO Realtime Cache Sync', () => {
  it('1. Loads initial branding from public settings API', async () => {
    jest.spyOn(publicApi, 'getPublicSettings').mockResolvedValue({
      title: 'VC Organic Dairy',
      logo: 'vc-logo.png'
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryProvider>
        <AuthProvider>
          <ToastProvider>
            <RealtimeProvider>{children}</RealtimeProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryProvider>
    );

    const { result } = renderHook(() => usePublicSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data?.title).toBe('VC Organic Dairy');
      expect(result.current.data?.logo).toBe('vc-logo.png');
    });
  });
});
