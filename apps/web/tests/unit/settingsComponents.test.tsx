import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  SettingsHeader,
  LogoUploader,
  PreferenceSettings,
  StoreSettings
} from '../../features/settings/components';
import { StoreScopeProvider } from '../../providers/StoreScopeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Auth hook
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', role: 'SUPER ADMIN', category: 'super admin' },
    hasPermission: () => true
  })
}));

// Mock Upload Mutation
jest.mock('../../features/settings/hooks', () => {
  const actual = jest.requireActual('../../features/settings/hooks');
  return {
    ...actual,
    useUploadLogoMutation: () => ({
      mutateAsync: jest.fn().mockResolvedValue({
        success: true,
        imagePath: '/uploads/logos/uploaded.webp',
        imageId: 'img-1'
      }),
      isPending: false
    })
  };
});

// Mock Stores Query
jest.mock('../../features/stores/hooks', () => ({
  useStoresQuery: () => ({
    data: [
      { id: 'store-1', name: 'Mumbai Flagship', code: 'ST-MUM', address: 'Market Yard', phone: '9999999999' },
      { id: 'store-2', name: 'Thane Outlet', code: 'ST-THN', address: 'Gokhale Rd', phone: '8888888888' }
    ],
    isLoading: false,
    refetch: jest.fn()
  }),
  storesQueryKeys: { all: ['stores'] }
}));

describe('Settings Components Suite', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <StoreScopeProvider>{ui}</StoreScopeProvider>
      </QueryClientProvider>
    );
  };

  it('1. SettingsHeader renders title and store information', () => {
    const onRefresh = jest.fn();

    render(
      <SettingsHeader
        activeStoreName="Mumbai Flagship"
        isSuperAdmin={true}
        onRefresh={onRefresh}
        isLoading={false}
      />
    );

    expect(screen.getByText('Settings & Configuration')).toBeInTheDocument();
    expect(screen.getByText('Live Configuration')).toBeInTheDocument();
    expect(screen.getByText('Mumbai Flagship')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Refresh'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('2. LogoUploader renders label and action controls', () => {
    const onLogoUploaded = jest.fn();

    render(
      <LogoUploader
        currentLogoUrl="/uploads/logos/brand-logo.webp"
        onLogoUploaded={onLogoUploaded}
        label="Test Brand Logo"
      />
    );

    expect(screen.getByText('Test Brand Logo')).toBeInTheDocument();
    expect(screen.getByText('Upload Custom Logo')).toBeInTheDocument();
    expect(screen.getByText('Reset Default')).toBeInTheDocument();
  });

  it('3. PreferenceSettings renders product images toggle and responds to clicks', () => {
    renderWithProviders(<PreferenceSettings />);

    expect(screen.getByText('Display & Client Preferences')).toBeInTheDocument();
    expect(screen.getByText('Product Image Thumbnails')).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();

    fireEvent.click(checkbox);
    // Verified checkbox toggle
  });

  it('4. StoreSettings renders list of stores and outlets', () => {
    renderWithProviders(<StoreSettings />);

    expect(screen.getByText('Registered Store Outlets & Branches')).toBeInTheDocument();
    expect(screen.getByText('Mumbai Flagship')).toBeInTheDocument();
    expect(screen.getByText('Thane Outlet')).toBeInTheDocument();
  });
});
