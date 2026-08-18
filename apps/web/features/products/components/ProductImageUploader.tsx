'use client';

import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { normalizePublicAssetUrl } from '../../../lib/utils/media';
import { productsApi } from '../api';
import { Button } from '../../../components/ui';

export interface ProductImageUploaderProps {
  value?: string;
  onChange: (imagePath: string) => void;
  disabled?: boolean;
}

export function ProductImageUploader({
  value,
  onChange,
  disabled = false
}: ProductImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    // Limit 5MB
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds maximum limit of 5MB.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await productsApi.uploadProductImage(file.name, base64Data);
          if (res.success && res.imagePath) {
            onChange(res.imagePath);
          } else {
            setUploadError('Failed to optimize and upload product image.');
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Server error uploading image.';
          setUploadError(msg);
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setUploadError('Failed to read selected image file.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadError('Failed to process image upload.');
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const normalizedUrl = value ? normalizePublicAssetUrl(value) : '';

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-700 select-none">
        Product Visual Asset
      </label>

      <div className="flex items-center gap-4">
        {/* Preview Box */}
        <div className="relative w-20 h-20 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
          {normalizedUrl ? (
            <img
              src={normalizedUrl}
              alt="Product thumbnail"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder if asset missing
                (e.target as HTMLImageElement).src = '';
              }}
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-slate-500" />
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-1.5 flex-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            disabled={disabled || isUploading}
          />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              leftIcon={<Upload className="w-3.5 h-3.5" />}
            >
              {value ? 'Replace Image' : 'Upload Image'}
            </Button>

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || isUploading}
                leftIcon={<X className="w-3.5 h-3.5 text-rose-400" />}
              >
                Remove
              </Button>
            )}
          </div>

          <p className="text-[11px] text-slate-600">
            JPG, PNG or WebP. Auto-compressed to 800x800 WebP with sharp optimization.
          </p>

          {uploadError && (
            <p className="text-xs text-rose-600 font-medium">{uploadError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
