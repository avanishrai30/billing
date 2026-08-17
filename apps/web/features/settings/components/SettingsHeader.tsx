import React from 'react';
import { Settings as SettingsIcon, Store, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';

export interface SettingsHeaderProps {
  activeStoreName: string;
  isSuperAdmin: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function SettingsHeader({
  activeStoreName,
  isSuperAdmin,
  onRefresh,
  isLoading
}: SettingsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#001845]/60 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Settings & Configuration
            </h1>
            <Badge variant="success" className="gap-1 px-2.5 py-0.5 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Live Configuration
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1 font-medium text-slate-300">
              <Store className="w-3.5 h-3.5 text-blue-400" />
              {activeStoreName}
            </span>
            <span>•</span>
            <span>{isSuperAdmin ? 'Full Enterprise Administration' : 'Store Scoped Profile'}</span>
          </div>
        </div>
      </div>

      {onRefresh && (
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="border-white/10 text-slate-300 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}
