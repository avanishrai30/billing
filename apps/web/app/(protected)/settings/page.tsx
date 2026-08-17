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
import { AccessDeniedState } from '../../../components/ui';

export default function SettingsPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const canView = hasPermission('settings.view');
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

  if (!canView) {
    return (
      <AccessDeniedState
        title="Settings & Configurations Restricted"
        message="Your role permissions do not authorize modification of system configurations, branding tokens, or print preferences."
        requiredPermission="settings.view"
      />
    );
  }

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
        isLoading={isSettingsLoading || isStoresLoading}
        onRefresh={handleRefreshAll}
      />

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-blue-500 text-white bg-white/5 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      <div className="pt-2">
        {activeTab === 'branding' && <BrandingSettings />}
        {activeTab === 'business' && (
          <div className="space-y-6">
            <BusinessSettings />
            <StoreSettings />
          </div>
        )}
        {activeTab === 'preferences' && <PreferenceSettings />}
      </div>
    </div>
  );
}
