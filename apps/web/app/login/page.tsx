'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, User, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import { ApiError } from '../../lib/errors/types';
import { normalizePublicAssetUrl } from '../../lib/utils/media';
import { SmokeyBackground } from '../../components/ui/smokey-background';

/**
 * Isolated Visual Background Layer.
 * Guaranteed to mount once and NEVER re-render on login input keystrokes.
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
  branding,
  isLoading
}: {
  branding?: { title?: string; logo?: string } | null;
  isLoading: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const rawLogo = branding?.logo || '';
  const brandLogoUrl = normalizePublicAssetUrl(rawLogo);
  const showImageLogo = mounted && !!brandLogoUrl && !imageError;
  const brandTitle = mounted ? branding?.title : null;

  return (
    <div className="p-8 pb-6 border-b border-white/10 text-center flex flex-col items-center">
      {/* Logo Frame */}
      <div className="w-16 h-16 mb-3.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center p-2.5 overflow-hidden flex-shrink-0">
        {showImageLogo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={brandLogoUrl!}
            alt={brandTitle || 'Brand Logo'}
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sky-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* Dynamic Brand Title (Deterministic First Paint) */}
      <div className="min-h-[32px] flex items-center justify-center">
        {brandTitle ? (
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {brandTitle}
          </h1>
        ) : isLoading || !mounted ? (
          <div className="h-7 w-48 bg-white/10 rounded-md animate-pulse" />
        ) : (
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Billing Terminal
          </h1>
        )}
      </div>
      <p className="text-xs text-slate-300 mt-1">Enterprise Point of Sale & Operations</p>
    </div>
  );
});
LoginBrandHeader.displayName = 'LoginBrandHeader';

/**
 * Isolated Form Component.
 * Localizes username/password typing state so keystrokes do NOT re-render the page or background.
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
    <div className="p-8 pt-6">
      {isSessionExpired && (
        <div
          data-testid="session-expired-banner"
          className="mb-5 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-2.5 text-amber-200 text-xs"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Your session has expired. Please sign in again to continue.</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          data-testid="login-error-alert"
          className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-200 text-xs"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider"
          >
            Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
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
              className="w-full pl-10 pr-3.5 py-2.5 bg-black/30 border border-white/15 rounded-xl text-white text-sm placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider"
          >
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
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
              className="w-full pl-10 pr-10 py-2.5 bg-black/30 border border-white/15 rounded-xl text-white text-sm placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Verifying credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In to Terminal</span>
              <ArrowRight className="w-4 h-4" />
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
  const { data: branding, isLoading: isBrandingLoading } = usePublicSettings();
  const router = useRouter();

  // Redirect to dashboard if session is already active
  useEffect(() => {
    if (isAuthenticated && lifecycle === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, lifecycle, router]);

  const handleLoginSuccess = useCallback(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#001845] overflow-hidden">
      {/* Decorative Interactive WebGL Smokey Shader Background (Isolated Memoized Layer) */}
      <LoginVisualLayer />

      {/* Modern Centered Glassmorphism Login Card */}
      <div className="relative z-10 w-full max-w-md bg-[#032154]/90 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header Branding with Fixed Geometry (Isolated Memoized Component) */}
        <LoginBrandHeader branding={branding} isLoading={isBrandingLoading} />

        {/* Form Body (Isolated Input State - typing does NOT re-render page or background) */}
        <LoginForm
          isSessionExpired={lifecycle === 'session-expired'}
          onLoginSuccess={handleLoginSuccess}
        />

        {/* Footer */}
        <div className="px-8 py-4 bg-[#021b47]/80 border-t border-white/10 text-center">
          <p className="text-[11px] text-slate-400">
            AIAVRO Billing OS • Multi-Outlet Gateway
          </p>
        </div>
      </div>
    </div>
  );
}
