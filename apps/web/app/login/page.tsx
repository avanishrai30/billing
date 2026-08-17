'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import { ApiError } from '../../lib/errors/types';
import { normalizePublicAssetUrl } from '../../lib/utils/media';
import { SmokeyBackground } from '../../components/ui/smokey-background';

export default function LoginPage() {
  const { login, isAuthenticated, lifecycle } = useAuth();
  const { data: branding } = usePublicSettings();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Redirect to dashboard if session is already active
  useEffect(() => {
    if (isAuthenticated && lifecycle === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, lifecycle, router]);

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
      router.replace('/dashboard');
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

  const brandTitle = branding?.title || 'AIAVRO Billing OS';
  const rawLogo = branding?.logo || '';
  const brandLogoUrl = normalizePublicAssetUrl(rawLogo);
  const showImageLogo = !!brandLogoUrl && !imageError;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#001845] overflow-hidden">
      {/* Decorative Interactive WebGL Smokey Background */}
      <SmokeyBackground color="#003882" backdropBlurAmount="md" className="z-0" />

      {/* Login Card Surface */}
      <div className="relative z-10 w-full max-w-md bg-[#032154]/90 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Branding */}
        <div className="p-8 pb-6 border-b border-white/10 text-center flex flex-col items-center">
          <div className="w-14 h-14 mb-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            {showImageLogo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={brandLogoUrl!}
                alt={brandTitle}
                className="w-10 h-10 object-contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sky-400 bg-sky-500/10">
                <ShieldCheck className="w-7 h-7" />
              </div>
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">{brandTitle}</h1>
          <p className="text-xs text-slate-400 mt-1">Point of Sale & Retail Operations</p>
        </div>

        {/* Form Body */}
        <div className="p-8 pt-6">
          {lifecycle === 'session-expired' && (
            <div
              data-testid="session-expired-banner"
              className="mb-5 p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-start gap-2.5 text-amber-200 text-xs"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Your session has expired. Please sign in again to continue.</span>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              data-testid="login-error-alert"
              className="mb-5 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-200 text-xs"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                  className="w-full pl-9 pr-3 py-2.5 bg-[#021b47] border border-white/15 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                  className="w-full pl-9 pr-10 py-2.5 bg-[#021b47] border border-white/15 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <span>Sign In to Terminal</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-[#021b47]/60 border-t border-white/5 text-center">
          <p className="text-[11px] text-slate-400">
            AIAVRO Billing OS • Multi-Outlet Gateway
          </p>
        </div>
      </div>
    </div>
  );
}
