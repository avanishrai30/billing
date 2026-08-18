import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tag, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { BrandingFormSchema, type BrandingFormValues } from '../schemas';
import { usePortalSettingsQuery, useUpdatePortalSettingsMutation } from '../hooks';
import { LogoUploader } from './LogoUploader';
import { useAuth } from '../../../hooks/useAuth';

export function BrandingSettings() {
  const { hasPermission } = useAuth();
  const canUpdateBranding = hasPermission('settings.update');

  const { data: publicSettings, isLoading, refetch } = usePortalSettingsQuery();
  const updateMutation = useUpdatePortalSettingsMutation();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty }
  } = useForm<BrandingFormValues>({
    resolver: zodResolver(BrandingFormSchema as any),
    defaultValues: {
      title: '',
      logo: ''
    }
  });

  const currentLogo = watch('logo');

  useEffect(() => {
    if (publicSettings) {
      reset({
        title: publicSettings.title || 'AIAVRO Business OS',
        logo: publicSettings.logo || '/uploads/logos/brand-logo.webp'
      });
    }
  }, [publicSettings, reset]);

  const onSubmit = async (values: BrandingFormValues) => {
    setFeedback(null);
    try {
      const res = await updateMutation.mutateAsync(values);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Portal branding updated successfully.' });
        refetch();
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to update branding' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'An error occurred while saving branding settings' });
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950 flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" />
            Global Portal Branding
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure system-wide portal title, brand identity, and application logo.
          </p>
        </div>
        {!canUpdateBranding && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
            Read-only mode (Requires settings.update permission)
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Logo Upload Component */}
        <LogoUploader
          currentLogoUrl={currentLogo}
          onLogoUploaded={(logoPath) => setValue('logo', logoPath, { shouldDirty: true })}
          disabled={!canUpdateBranding || isLoading}
          label="Portal Brand Logo"
          description="System-wide logo displayed on navigation bar, login screen, and report headers."
        />

        {/* Portal Title Input */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-800 block">
            Portal Application Title <span className="text-rose-600">*</span>
          </label>
          <Input
            {...register('title')}
            placeholder="e.g. VC Organics Billing OS"
            disabled={!canUpdateBranding || isLoading}
            className="font-medium"
          />
          {errors.title && (
            <p className="text-xs text-rose-700">{errors.title.message}</p>
          )}
          <p className="text-xs text-slate-500">
            Displayed on browser tabs, login portal banner, and system-wide header badges.
          </p>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Save Button */}
        {canUpdateBranding && (
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={updateMutation.isPending || isLoading || !isDirty}
              className="px-6 py-2.5 font-semibold"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving Branding...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Branding Settings
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
