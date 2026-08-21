'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, User, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import { ApiError } from '../../lib/errors/types';
import { normalizePublicAssetUrl } from '../../lib/utils/media';
import { LoginMetamorphicBackground } from '../../components/ui/login-metamorphic-background';

/**
 * Isolated Visual Background Layer.
 * Guaranteed to mount once and NEVER re-render on login input keystrokes.
 */
const LoginVisualLayer = React.memo(function LoginVisualLayer() {
  return <LoginMetamorphicBackground className="z-0" />;
});
LoginVisualLayer.displayName = 'LoginVisualLayer';

/**
 * Reusable Glass Input Wrapper inspired by Untitled UI.
 */
const GlassInputWrapper = ({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-2xl border border-white/80 bg-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-md transition-colors focus-within:border-emerald-900/70 focus-within:bg-white/90 focus-within:ring-4 focus-within:ring-emerald-900/10 ${className}`}
  >
    {children}
  </div>
);

const editorialEnter =
  'opacity-0 translate-y-2 [filter:blur(4px)] motion-safe:animate-[fadeSlideIn_220ms_cubic-bezier(0.16,1,0.3,1)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:[filter:blur(0px)]';

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
  const brandTitle = branding?.title?.trim() || "VC ORGANIC'S";

  return (
    <div className="px-7 pt-7 pb-5 sm:px-8 sm:pt-8 sm:pb-6 text-left">
      {/* Logo Frame */}
      <div
        className={`w-14 h-14 mb-5 rounded-2xl bg-white/80 border border-white/90 flex items-center justify-center p-2.5 overflow-hidden flex-shrink-0 shadow-[0_16px_36px_rgba(20,57,36,0.10)] ${editorialEnter}`}
        style={{ animationDelay: '40ms' }}
      >
        {showImageLogo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={brandLogoUrl!}
            alt={brandTitle || 'Brand Logo'}
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-emerald-800">
            <ShieldCheck className="w-7 h-7" />
          </div>
        )}
      </div>

      {/* Dynamic Brand Title (Deterministic First Paint) */}
      <div
        className={`min-h-[32px] flex items-center ${editorialEnter}`}
        style={{ animationDelay: '100ms' }}
      >
        <h1
          suppressHydrationWarning
          className="text-2xl sm:text-[1.7rem] font-bold tracking-tight text-[#102a1a]"
        >
          {brandTitle}
        </h1>
      </div>
      <p
        className={`text-sm text-emerald-950/68 mt-2 font-medium leading-6 max-w-[30ch] ${editorialEnter}`}
        style={{ animationDelay: '160ms' }}
      >
        Editorial operations gateway for multi-outlet billing, stock, and sales control.
      </p>
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
  const [rememberMe, setRememberMe] = useState(false);
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
    <div className="px-7 pb-7 pt-2 sm:px-8 sm:pb-8">
      {isSessionExpired && (
        <div
          data-testid="session-expired-banner"
          className="mb-5 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-start gap-2.5 text-amber-800 text-xs shadow-xs"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <span>Your session has expired. Please sign in again to continue.</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          data-testid="login-error-alert"
          className="mb-5 p-3.5 rounded-xl bg-rose-50/90 border border-rose-200/80 flex items-start gap-2.5 text-rose-800 text-xs shadow-xs"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className={editorialEnter} style={{ animationDelay: '220ms' }}>
          <label
            htmlFor="username"
            className="block text-xs font-semibold text-emerald-950/78 mb-1.5"
          >
            Username
          </label>
          <GlassInputWrapper>
            <div className="relative flex items-center">
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
                className="w-full pl-10 pr-3.5 py-3.5 bg-transparent rounded-2xl text-slate-950 text-sm placeholder-slate-500 focus:outline-none disabled:opacity-50"
              />
            </div>
          </GlassInputWrapper>
        </div>

        <div className={editorialEnter} style={{ animationDelay: '280ms' }}>
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-emerald-950/78 mb-1.5"
          >
            Password
          </label>
          <GlassInputWrapper>
            <div className="relative flex items-center">
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
                className="w-full pl-10 pr-11 py-3.5 bg-transparent rounded-2xl text-slate-950 text-sm placeholder-slate-500 focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-emerald-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800/30 cursor-pointer z-10"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </GlassInputWrapper>
        </div>

        <div
          className={`flex items-center justify-between gap-3 text-xs pt-0.5 ${editorialEnter}`}
          style={{ animationDelay: '340ms' }}
        >
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
            />
            <span className="text-emerald-950/70 font-medium">Keep me signed in</span>
          </label>
          <span className="text-emerald-950/45 font-medium hidden min-[380px]:inline">Multi-outlet gateway</span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full mt-2 py-3.5 px-4 bg-[#143924] hover:bg-[#1B4B2F] active:scale-[0.98] active:bg-[#0F2A1B] text-white font-semibold rounded-2xl text-sm transition-[background-color,transform,opacity] flex items-center justify-center gap-2 shadow-[0_16px_34px_rgba(20,57,36,0.22)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${editorialEnter}`}
          style={{ animationDelay: '400ms' }}
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
    <div
      data-testid="login-editorial-shell"
      className="relative min-h-[100dvh] w-full bg-[#F4F7F4] overflow-x-hidden"
    >
      {/* Decorative Interactive WebGL Botanical Metamorphic Background (Isolated Memoized Layer) */}
      <LoginVisualLayer />

      <div className="relative z-10 grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[minmax(0,1.18fr)_minmax(430px,0.82fr)]">
        <section
          data-testid="login-editorial-visual-field"
          aria-hidden="true"
          className="min-h-[34dvh] sm:min-h-[38dvh] lg:min-h-[100dvh]"
        />

        <section className="flex min-h-[66dvh] items-center justify-center px-4 pb-5 sm:px-8 sm:pb-8 lg:min-h-[100dvh] lg:px-10 lg:py-10 xl:px-16">
          {/* VC ORGANIC Translucent Botanical Glass Login Surface */}
          <div
            data-testid="login-editorial-panel"
            className="w-full max-w-[452px] overflow-hidden rounded-[28px] border border-white/75 bg-white/72 shadow-[0_28px_80px_rgba(18,48,28,0.12)] backdrop-blur-2xl"
          >
            {/* Header Branding with Fixed Geometry (Isolated Memoized Component) */}
            <LoginBrandHeader branding={branding} isLoading={isBrandingLoading} />

            {/* Form Body (Isolated Input State - typing does NOT re-render page or background) */}
            <LoginForm
              isSessionExpired={lifecycle === 'session-expired'}
              onLoginSuccess={handleLoginSuccess}
            />

            {/* Quiet Translucent Glass Footer */}
            <div className="px-7 py-3.5 sm:px-8 bg-white/38 border-t border-white/60 text-left">
              <p className="text-[11px] text-emerald-950/52 font-medium tracking-wide">
                AIAVRO Billing OS • Multi-Outlet Gateway
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
