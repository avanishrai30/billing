'use client';

import React, { useState, useEffect } from 'react';
import { Palette, Building2, Sliders } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useStoreScope } from '../../../providers/StoreScopeProvider';
import { useStoresQuery } from '../../../features/stores/hooks';
import { usePortalSettingsQuery } from '../../../features/settings/hooks';
import {
  SettingsHeader,
  BrandingSettings,
  BusinessSettings,
  StoreSettings,
  PreferenceSettings,
  type SettingsTabId
} from '../../../features/settings';
import { realtimeManager } from '../../../lib/realtime/socket';
import { useQueryClient } from '@tanstack/react-query';
import { settingsQueryKeys } from '../../../features/settings/hooks';
import { storeQueryKeys } from '../../../features/stores/hooks';

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const { activeStoreId } = useStoreScope();
  const { data: stores = [], refetch: refetchStores, isLoading: isStoresLoading } = useStoresQuery();
  const { refetch: refetchSettings, isLoading: isSettingsLoading } = usePortalSettingsQuery();

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTabId>('branding');

  const isSuperAdmin = currentUser?.role === 'SUPER ADMIN' || currentUser?.category === 'super admin' || currentUser?.category === 'admin';

  const activeStore = stores.find((s) => s.id === activeStoreId) || stores[0];
  const activeStoreName = activeStore ? activeStore.name : 'All Outlets';

  // Listen for realtime settings and store updates
  useEffect(() => {
    const unsubSettings = realtimeManager.subscribe('settings_updated', () => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.public });
    });

    const unsubStore = realtimeManager.subscribe('store_updated', () => {
      queryClient.invalidateQueries({ queryKey: storeQueryKeys.all });
    });

    return () => {
      unsubSettings();
      unsubStore();
    };
  }, [queryClient]);

  const handleRefreshAll = () => {
    refetchSettings();
    refetchStores();
  };

  const tabs: { id: SettingsTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'branding', label: 'Portal Branding & Identity', icon: Palette },
    { id: 'business', label: 'Store & Business Profile', icon: Building2 },
    { id: 'preferences', label: 'Workstation Preferences', icon: Sliders }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <SettingsHeader
        activeStoreName={activeStoreName}
        isSuperAdmin={isSuperAdmin}
        onRefresh={handleRefreshAll}
        isLoading={isSettingsLoading || isStoresLoading}
      />

      {/* Segmented Tab Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-[#001845]/40 border border-white/10 rounded-xl overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      <div className="space-y-6">
        {activeTab === 'branding' && <BrandingSettings />}

        {activeTab === 'business' && (
          <>
            <BusinessSettings />
            <StoreSettings />
          </>
        )}

        {activeTab === 'preferences' && <PreferenceSettings />}
      </div>
    </div>
  );
}
