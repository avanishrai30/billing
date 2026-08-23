'use client';

import React, { useState } from 'react';
import { User } from 'lucide-react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  status?: 'online' | 'busy' | 'offline';
  className?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; icon: string; text: string; dot: string }> = {
  xs: {
    container: 'w-6 h-6',
    icon: 'w-3 h-3',
    text: 'text-[10px]',
    dot: 'w-1.5 h-1.5'
  },
  sm: {
    container: 'w-8 h-8',
    icon: 'w-4 h-4',
    text: 'text-xs',
    dot: 'w-2 h-2'
  },
  md: {
    container: 'w-10 h-10',
    icon: 'w-5 h-5',
    text: 'text-sm',
    dot: 'w-2.5 h-2.5'
  },
  lg: {
    container: 'w-12 h-12',
    icon: 'w-6 h-6',
    text: 'text-base',
    dot: 'w-3 h-3'
  },
  xl: {
    container: 'w-16 h-16',
    icon: 'w-8 h-8',
    text: 'text-lg',
    dot: 'w-3.5 h-3.5'
  },
  '2xl': {
    container: 'w-24 h-24',
    icon: 'w-12 h-12',
    text: 'text-2xl',
    dot: 'w-4 h-4'
  }
};

const statusColors = {
  online: 'bg-emerald-400',
  busy: 'bg-amber-400',
  offline: 'bg-slate-500'
};

export function Avatar({
  src,
  name,
  size = 'sm',
  status,
  className = ''
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sz = sizeStyles[size];

  React.useEffect(() => {
    setImgError(false);
  }, [src]);

  const getInitials = (n?: string) => {
    if (!n) return '';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);
  const showImage = !!src && !imgError;

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}>
      <div
        className={`${sz.container} rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold overflow-hidden shadow-xs select-none`}
      >
        {showImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src!}
            alt={name || 'Avatar'}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : initials ? (
          <span className={sz.text}>{initials}</span>
        ) : (
          <User className={`${sz.icon} text-slate-500`} />
        )}
      </div>

      {status && (
        <span
          className={`absolute bottom-0 right-0 ${sz.dot} rounded-full ${statusColors[status]} ring-2 ring-white`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
