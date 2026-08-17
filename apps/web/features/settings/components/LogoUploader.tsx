import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Loader2, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../../../components/ui';
import { useUploadLogoMutation } from '../hooks';
import { normalizePublicAssetUrl } from '../../../lib/utils/media';

export interface LogoUploaderProps {
  currentLogoUrl?: string;
  onLogoUploaded: (logoPath: string) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export function LogoUploader({
  currentLogoUrl,
  onLogoUploaded,
  disabled = false,
  label = 'Brand / Store Logo',
  description = 'Upload PNG, JPG, or WebP image. Automatically optimized for dashboard and invoice printing.'
}: LogoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadMutation = useUploadLogoMutation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image file size must be less than 5MB');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setPreviewUrl(base64Data);

      try {
        const res = await uploadMutation.mutateAsync({
          fileName: file.name,
          base64Data
        });

        if (res.success && res.imagePath) {
          onLogoUploaded(res.imagePath);
          setSuccessMsg('Logo uploaded and optimized successfully!');
          setTimeout(() => setSuccessMsg(null), 4000);
        } else {
          setErrorMsg('Failed to upload image. Please try again.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error uploading image asset');
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read selected image file');
    };
    reader.readAsDataURL(file);
  };

  const effectiveDisplayUrl = previewUrl || (currentLogoUrl ? normalizePublicAssetUrl(currentLogoUrl) : null);

  const handleResetToDefault = () => {
    setPreviewUrl(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    onLogoUploaded('/uploads/logos/brand-logo.webp');
  };

  return (
    <div className="bg-[#021b47] border border-white/10 rounded-2xl p-5 space-y-4">
      <div>
        <label className="text-sm font-semibold text-slate-200 block">{label}</label>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Logo Preview Frame */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center p-2 overflow-hidden flex-shrink-0 relative">
          {effectiveDisplayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={effectiveDisplayUrl}
              alt="Brand Logo Preview"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-slate-500" />
          )}

          {uploadMutation.isPending && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-3 w-full sm:w-auto">
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={disabled || uploadMutation.isPending}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploadMutation.isPending}
              className="border-white/10 text-white hover:bg-white/10"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-400" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2 text-blue-400" />
                  Upload Custom Logo
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetToDefault}
              disabled={disabled || uploadMutation.isPending}
              className="text-slate-400 hover:text-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset Default
            </Button>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
