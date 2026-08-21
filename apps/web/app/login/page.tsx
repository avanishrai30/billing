'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import { ApiError } from '../../lib/errors/types';
import { normalizePublicAssetUrl } from '../../lib/utils/media';
import { SmokeyBackground } from '../../components/ui/smokey-background';

const BRAND_FALLBACK = "VC ORGANIC'S";

/**
 * Isolated Visual Background Layer.
 * Guaranteed to mount once and never re-render on login input keystrokes.
 */
const LoginVisualLayer = React.memo(function LoginVisualLayer() {
  return <SmokeyBackground color="#003882" backdropBlurAmount="md" className="z-0" />;
});
LoginVisualLayer.displayName = 'LoginVisualLayer';

/**
 * Isolated Branding Header.
 * Re-renders only when branding query resolves, independent of input keystrokes.
 */
const LoginBrandHeader = React.memo(function LoginBrandHeader({
  branding
}: {
  branding?: { title?: string; logo?: string } | null;
}) {
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const rawLogo = branding?.logo || '';
  const brandLogoUrl = normalizePublicAssetUrl(rawLogo);
  const brandTitle = branding?.title?.trim() || BRAND_FALLBACK;
  const showImageLogo = mounted && !!brandLogoUrl && !imageError;

  return (
    <div className="px-7 pt-7 pb-5 text-center sm:px-8 sm:pt-8 sm:pb-6">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2.5 shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
        {showImageLogo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={brandLogoUrl!}
            alt={brandTitle}
            className="h-full w-full object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-blue-700">
            <ShieldCheck className="h-8 w-8" />
          </div>
        )}
      </div>

      <h1
        suppressHydrationWarning
        className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.7rem]"
      >
        {brandTitle}
      </h1>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
        Enterprise Point of Sale & Operations
      </p>
    </div>
  );
});
LoginBrandHeader.displayName = 'LoginBrandHeader';

/**
 * Isolated Form Component.
 * Localizes username/password typing state so keystrokes do not re-render the page or background.
 */
const LoginForm = React.memo(function LoginForm({
  isSessionExpired,
  onLoginSuccess
}: {
  isSessionExpired: boolean;
  onLoginSuccess: () => void;
}) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorMessage('Please enter both your username and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ username: trimmedUser, password });
      onLoginSuccess();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_CREDENTIALS') {
          setErrorMessage('Invalid username or password. Please verify your credentials.');
        } else if (err.code === 'ACCOUNT_SUSPENDED' || err.code === 'ACCOUNT_DEACTIVATED') {
          setErrorMessage('Your user account has been suspended. Please contact your administrator.');
        } else if (err.code === 'TIMEOUT') {
          setErrorMessage('Connection timed out. Please check your network connection.');
        } else {
          setErrorMessage(err.message || 'Authentication failed. Please try again.');
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message || 'Unable to connect to the authentication service.');
      } else {
        setErrorMessage('An unexpected authentication error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-7 pb-7 pt-1 sm:px-8 sm:pb-8">
      {isSessionExpired && (
        <div
          data-testid="session-expired-banner"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <span>Your session has expired. Please sign in again to continue.</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          data-testid="login-error-alert"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700"
          >
            Username
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              disabled={isSubmitting}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3.5 text-sm text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/12 disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700"
          >
            Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/12 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 z-10 flex items-center pr-3.5 text-slate-500 outline-none transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500/30"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-colors hover:bg-blue-600 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Verifying credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In to Terminal</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
});
LoginForm.displayName = 'LoginForm';

/**
 * Top-Level LoginPage Shell.
 * Orchestrates sub-components without re-rendering on input keystrokes.
 */
export default function LoginPage() {
  const { isAuthenticated, lifecycle } = useAuth();
  const { data: branding } = usePublicSettings();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && lifecycle === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, lifecycle, router]);

  const handleLoginSuccess = useCallback(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div
      data-testid="login-smoky-shell"
      className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#001845] px-4 py-8 sm:px-6"
    >
      <LoginVisualLayer />

      <div
        data-testid="login-smoky-card"
        className="relative z-10 w-full max-w-[460px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_28px_80px_rgba(0,0,0,0.34)]"
      >
        <LoginBrandHeader branding={branding} />

        <LoginForm
          isSessionExpired={lifecycle === 'session-expired'}
          onLoginSuccess={handleLoginSuccess}
        />

        <div className="border-t border-slate-100 bg-slate-50 px-7 py-4 text-center sm:px-8">
          <p className="text-[11px] font-medium tracking-wide text-slate-500">
            AIAVRO Billing OS • Multi-Outlet Gateway
          </p>
        </div>
      </div>
    </div>
  );
}
