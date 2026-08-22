'use client';

import React from 'react';
import { Camera, Save, ShieldCheck, Upload, UserCircle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import {
  useMyActivityQuery,
  useUpdateAvatarMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation
} from '../../../features/users';
import { AuditEventBadge } from '../../../features/audit';
import { Button, FormField, Input } from '../../../components/ui';
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
  const updateProfileMutation = useUpdateProfileMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();
  const updateAvatarMutation = useUpdateAvatarMutation();
  const { data: activity = [], isLoading: isLoadingActivity } = useMyActivityQuery();

  const [name, setName] = React.useState(user?.name || '');
  const [email, setEmail] = React.useState(user?.email || '');
  const [phone, setPhone] = React.useState(user?.phone || '');
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  React.useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
  }, [user?.name, user?.email, user?.phone]);

  const avatarUrl = previewUrl || normalizePublicAssetUrl(user?.avatar || undefined);
  const isSaving = updateProfileMutation.isPending || uploadAvatarMutation.isPending || updateAvatarMutation.isPending;

  const handleSaveProfile = async () => {
    setFeedback(null);
    try {
      await updateProfileMutation.mutateAsync({ name, email, phone });
      await refreshSession();
      setFeedback({ type: 'success', message: 'Profile updated.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to update profile.' });
    }
  };

  const handleAvatarFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFeedback(null);

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Choose a PNG, JPEG, or WebP image.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Profile image must be 5 MB or smaller.' });
      return;
    }

    try {
      const base64Data = await readFileAsDataUrl(file);
      setPreviewUrl(base64Data);
      const upload = await uploadAvatarMutation.mutateAsync({ fileName: file.name, base64Data });
      await updateAvatarMutation.mutateAsync(upload.imagePath);
      await refreshSession();
      setPreviewUrl(null);
      setFeedback({ type: 'success', message: 'Profile picture updated.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to upload profile picture.' });
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your personal details, profile picture, and own activity.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-xs">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          Role and access are managed by administrators.
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={user?.name || 'Profile'} className="h-full w-full object-cover" />
                ) : (
                  <UserCircle className="h-10 w-10" />
                )}
              </div>
              <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" />
                Upload
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleAvatarFile} disabled={isSaving} />
              </label>
            </div>

            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <FormField label="Name" required>
                <Input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
              </FormField>
              <FormField label="Username">
                <Input aria-label="Username" value={user?.username || ''} disabled className="font-mono" />
              </FormField>
              <FormField label="Email">
                <Input aria-label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormField>
              <FormField label="Phone">
                <Input aria-label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </FormField>
              <FormField label="Role">
                <Input aria-label="Role" value={user?.role || user?.category || ''} disabled />
              </FormField>
              <FormField label="Store Scope">
                <Input aria-label="Store Scope" value={user?.assignedStoreId || 'all'} disabled className="font-mono" />
              </FormField>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button onClick={handleSaveProfile} isLoading={updateProfileMutation.isPending} leftIcon={<Save className="h-4 w-4" />}>
              Save Profile
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <Camera className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-950">My Activity</h2>
          </div>

          {isLoadingActivity ? (
            <p className="text-sm text-slate-500">Loading activity...</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-slate-500">No personal activity has been recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {activity.slice(0, 8).map((item) => (
                <div key={item._id || `${item.eventType}-${item.timestamp}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <AuditEventBadge eventType={item.eventType} action={item.action} />
                    <span className="text-[11px] text-slate-500">{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{item.details}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
