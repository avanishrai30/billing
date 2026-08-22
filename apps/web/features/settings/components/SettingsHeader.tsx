import React from 'react';
import { Settings as SettingsIcon, Store, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';

export interface SettingsHeaderProps {
  activeStoreName: string;
  canUpdateSettings: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function SettingsHeader({
  activeStoreName,
  canUpdateSettings,
  onRefresh,
  isLoading
}: SettingsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 sm:p-5 rounded-xl shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-950 tracking-tight">
              Settings & Configuration
            </h1>
            <Badge variant="success" className="gap-1 px-2.5 py-0.5 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Live Configuration
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <Store className="w-3.5 h-3.5 text-blue-600" />
              {activeStoreName}
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />
            <span>{canUpdateSettings ? 'Configuration Editing Enabled' : 'Read-Only Configuration Access'}</span>
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
            leftIcon={<RefreshCw className={isLoading ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}
