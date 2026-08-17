'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from './Button';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading data...', className = '' }: LoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-[#111827] border border-white/10 rounded-xl ${className}`}
    >
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
      <span className="text-xs text-slate-300 font-mono">{message}</span>
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Failed to load content',
  message = 'An unexpected error occurred while communicating with the service.',
  onRetry,
  className = ''
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-[#111827] border border-rose-500/30 rounded-xl ${className}`}
    >
      <div className="w-12 h-12 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="text-xs text-slate-300 mt-1 max-w-sm leading-relaxed">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button
            variant="danger"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry Request
          </Button>
        </div>
      )}
    </div>
  );
}

export interface AccessDeniedStateProps {
  title?: string;
  message?: string;
  requiredPermission?: string;
  className?: string;
}

export function AccessDeniedState({
  title = 'Access Restricted',
  message = 'Your user account or role permissions do not authorize access to this module.',
  requiredPermission,
  className = ''
}: AccessDeniedStateProps) {
  return (
    <div
      role="alert"
      data-testid="access-denied-state"
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-[#111827] border border-amber-500/30 rounded-xl ${className}`}
    >
      <div className="w-12 h-12 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="text-xs text-slate-300 mt-1 max-w-md leading-relaxed">{message}</p>
      {requiredPermission && (
        <div className="mt-2 text-[11px] font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded border border-white/10">
          Required privilege: <span className="text-amber-300">{requiredPermission}</span>
        </div>
      )}
      <div className="mt-5">
        <Link href="/dashboard">
          <Button variant="secondary" size="sm" leftIcon={<Home className="w-3.5 h-3.5" />}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
