'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  Save,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Store,
  Clock,
  User,
  Mail,
  Phone,
  BadgeCheck,
  Shield,
  Activity
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import {
  useMyActivityQuery,
  useUpdateAvatarMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useChangePasswordMutation
} from '../../../features/users';
import { useStoresQuery } from '../../../features/stores/hooks';
import { AuditEventBadge } from '../../../features/audit';
import { Button, FormField, Input, Avatar, useToast } from '../../../components/ui';
import { normalizePublicAssetUrl } from '../../../lib/utils/media';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { user, refreshSession } = useAuth();
  const { data: stores = [] } = useStoresQuery();
  const { success, error: toastError } = useToast();

  const updateProfileMutation = useUpdateProfileMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();
  const updateAvatarMutation = useUpdateAvatarMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const { data: activity = [], isLoading: isLoadingActivity } = useMyActivityQuery();

  // Profile fields state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
  }, [user?.name, user?.email, user?.phone]);

  // Resolve dynamic store scope label
  const resolvedStoreScope = useMemo(() => {
    if (!user?.assignedStoreId || user.assignedStoreId === 'all') {
      return '🌐 All Stores (Enterprise)';
    }
    const matchingStore = stores.find((s) => s.id === user.assignedStoreId);
    return matchingStore ? `📍 ${matchingStore.name}` : `📍 ${user.assignedStoreId}`;
  }, [user?.assignedStoreId, stores]);

  const rawAvatar = user?.avatar;
  const avatarSrc = previewUrl || (rawAvatar ? normalizePublicAssetUrl(rawAvatar) : null);
  const hasCustomAvatar = Boolean(user?.avatar);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toastError('Name Required', 'Please enter your full name.');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined
      });
      await refreshSession();
      success('Profile Saved', 'Your personal details have been updated successfully.');
    } catch (err: any) {
      toastError('Profile Save Failed', err?.message || 'Failed to update personal details.');
    }
  };

  const handleAvatarFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toastError('Invalid Format', 'Please select a PNG, JPEG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toastError('File Too Large', 'Profile image must be 5 MB or smaller.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const base64Data = await readFileAsDataUrl(file);
      setPreviewUrl(base64Data);
      const upload = await uploadAvatarMutation.mutateAsync({ fileName: file.name, base64Data });
      await updateAvatarMutation.mutateAsync(upload.imagePath);
      await refreshSession();
      setPreviewUrl(null);
      success('Avatar Updated', 'Your profile picture has been updated and synchronized.');
    } catch (err: any) {
      setPreviewUrl(null);
      toastError('Upload Failed', err?.message || 'Failed to upload profile picture.');
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!hasCustomAvatar && !previewUrl) return;
    setIsUploadingAvatar(true);
    try {
      await updateAvatarMutation.mutateAsync(null);
      await refreshSession();
      setPreviewUrl(null);
      success('Avatar Removed', 'Your avatar has been reset to default initials.');
    } catch (err: any) {
      toastError('Remove Failed', err?.message || 'Failed to remove profile picture.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      success('Password Updated', 'Your account password has been changed securely.');
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to update password. Verify your current password.';
      setPasswordError(errMsg);
      toastError('Password Change Failed', errMsg);
    }
  };

  const roleTitle = user?.role || (user?.category ? user.category.toUpperCase() : 'EMPLOYEE');

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Page Title & Breadcrumb Area */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">My Profile</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage your personal credentials, profile picture, and review your account activity.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          Role and access are managed by administrators.
        </div>
      </div>

      {/* ========================================================
          1. COMPACT PROFILE IDENTITY HERO
      ======================================================== */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Avatar with interactive overlay */}
            <div className="relative flex-shrink-0">
              <Avatar
                src={avatarSrc}
                name={user?.name || user?.username || 'User'}
                size="2xl"
                className="h-20 w-20 rounded-2xl border-2 border-white/20 bg-slate-800 text-xl font-bold shadow-inner sm:h-22 sm:w-22"
              />
              {isUploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/70 backdrop-blur-xs">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>

            {/* Identity Information */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {user?.name || user?.username || 'Authenticated User'}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/40 ring-inset">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Active
                </span>
              </div>

              <p className="mt-0.5 truncate font-mono text-xs text-slate-300">
                @{user?.username || 'user'} {user?.email && `• ${user.email}`}
              </p>

              {/* Badges */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 backdrop-blur-xs">
                  <Shield className="h-3.5 w-3.5 text-blue-400" />
                  {roleTitle}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 backdrop-blur-xs">
                  <Store className="h-3.5 w-3.5 text-emerald-400" />
                  {resolvedStoreScope}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Avatar Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:self-center">
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3.5 text-xs font-semibold text-slate-900 shadow-xs transition-colors hover:bg-slate-100 disabled:opacity-50">
              <Upload className="h-3.5 w-3.5 text-slate-700" />
              Upload Photo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={handleAvatarFile}
                disabled={isUploadingAvatar}
              />
            </label>

            {hasCustomAvatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={isUploadingAvatar}
                aria-label="Remove profile photo"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-medium text-slate-200 transition-colors hover:bg-rose-500/20 hover:text-rose-200 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================
          2. MAIN CONTENT GRID (Personal Details vs Account & Security)
      ======================================================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN (lg:col-span-7) — Personal Details */}
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 lg:col-span-7">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                <User className="h-4 w-4 text-blue-600" />
                Personal Details
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Update your identity details shown across receipts and transactions.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Full Name" required>
                <Input
                  aria-label="Full Name"
                  placeholder="e.g. Rajesh Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="font-medium text-slate-900"
                />
              </FormField>

              <FormField label="Username (Identifier)">
                <Input
                  aria-label="Username"
                  value={user?.username || ''}
                  disabled
                  className="bg-slate-50 font-mono text-slate-500 cursor-not-allowed"
                />
              </FormField>

              <FormField label="Email Address">
                <Input
                  aria-label="Email"
                  type="email"
                  placeholder="user@vcorganics.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormField>

              <FormField label="Contact Phone">
                <Input
                  aria-label="Phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </FormField>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-medium text-slate-800">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Account Record
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                User ID: <span className="font-mono text-slate-700">{user?.id || '—'}</span> • Last Updated:{' '}
                <span className="font-mono text-slate-700">
                  {user?.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'Recent'}
                </span>
              </p>
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={updateProfileMutation.isPending}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </section>

        {/* RIGHT COLUMN (lg:col-span-5) — Account Scope & Password */}
        <div className="space-y-6 lg:col-span-5">
          {/* Account Privileges Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Access & Scope
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Administrative security assignments governing your workspace permissions.
              </p>
            </div>

            <div className="mt-4 space-y-3.5">
              {/* Role Info */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Authorization Role</span>
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-600/20 ring-inset">
                    {roleTitle}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Authorization role is managed by administrators via the RBAC control center.
                </p>
              </div>

              {/* Store Scope Info */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Store Scope</span>
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">
                    {resolvedStoreScope}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Store scope is managed by administrators to partition inventory and financial operations.
                </p>
              </div>
            </div>
          </section>

          {/* Change Password Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  Security & Password
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Change your authentication credentials securely.
                </p>
              </div>

              {passwordError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  {passwordError}
                </div>
              )}

              <div className="space-y-3">
                <FormField label="Current Password" required>
                  <div className="relative">
                    <Input
                      aria-label="Current Password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormField>

                <FormField label="New Password (min. 6 chars)" required>
                  <div className="relative">
                    <Input
                      aria-label="New Password"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormField>

                <FormField label="Confirm New Password" required>
                  <div className="relative">
                    <Input
                      aria-label="Confirm New Password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormField>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  variant="secondary"
                  isLoading={changePasswordMutation.isPending}
                  leftIcon={<KeyRound className="h-4 w-4" />}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>

      {/* ========================================================
          3. COMPACT RECENT ACTIVITY TIMELINE
      ======================================================== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
              <Activity className="h-4 w-4 text-blue-600" />
              Recent Account Activity
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Chronological log of actions, sales, procurement, and login events performed by your session.
            </p>
          </div>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-medium text-slate-600">
            {activity.length} Records
          </span>
        </div>

        <div className="mt-4">
          {isLoadingActivity ? (
            <div className="flex items-center justify-center py-8 text-xs text-slate-500">
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              Loading activity trail...
            </div>
          ) : activity.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-500">
              No recent activity entries recorded for this account.
            </div>
          ) : (
            <div className="max-h-[320px] space-y-2.5 overflow-y-auto pr-1">
              {activity.map((item) => (
                <div
                  key={item._id || `${item.eventType}-${item.timestamp}`}
                  className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <AuditEventBadge eventType={item.eventType} action={item.action} />
                    <div>
                      <p className="font-medium text-slate-800">{item.details || item.action || item.eventType}</p>
                      {item.performedBy && (
                        <p className="text-[11px] text-slate-500">By: {item.performedBy}</p>
                      )}
                    </div>
                  </div>

                  <span className="font-mono text-[11px] text-slate-500 sm:self-center">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
