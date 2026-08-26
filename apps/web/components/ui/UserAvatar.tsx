'use client';

import React, { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import { normalizeUserAvatarUrl } from '../../lib/utils/media';

export type UserAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface UserAvatarUser {
  id?: string;
  name?: string;
  username?: string;
  avatar?: string | null;
  avatarUpdatedAt?: string | null;
  updatedAt?: string | null;
}

export interface UserAvatarProps {
  user?: UserAvatarUser | null;
  name?: string;
  username?: string;
  avatar?: string | null;
  avatarUpdatedAt?: string | null;
  updatedAt?: string | null;
  size?: UserAvatarSize;
  status?: 'online' | 'busy' | 'offline';
  className?: string;
  showFallback?: boolean;
  priority?: boolean;
  shape?: 'circle' | 'rounded';
}

const sizeStyles: Record<UserAvatarSize, { container: string; icon: string; text: string; dot: string }> = {
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
    container: 'w-20 h-20 sm:w-22 sm:h-22',
    icon: 'w-10 h-10',
    text: 'text-2xl',
    dot: 'w-4 h-4'
  }
};

const statusColors = {
  online: 'bg-emerald-500',
  busy: 'bg-amber-500',
  offline: 'bg-slate-400'
};

/**
 * Derives uppercase initials from user name or username according to canonical business rules:
 * - Single word (e.g. "Rajesh") -> "R"
 * - Multi word (e.g. "Pradeep H") -> "PH"
 * - 3+ words (e.g. "VC Organic Owner") -> "VO"
 */
export function getUserInitials(name?: string, username?: string): string {
  const text = (name || username || '').trim();
  if (!text) return 'U';
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  const first = parts[0].charAt(0).toUpperCase();
  const last = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first}${last}`;
}

export function UserAvatar({
  user,
  name,
  username,
  avatar,
  avatarUpdatedAt,
  updatedAt,
  size = 'sm',
  status,
  className = '',
  showFallback = true,
  priority = false,
  shape = 'circle'
}: UserAvatarProps) {
  const effectiveName = name || user?.name;
  const effectiveUsername = username || user?.username;
  const rawAvatar = avatar !== undefined ? avatar : user?.avatar;
  const rawVersion =
    avatarUpdatedAt ||
    user?.avatarUpdatedAt ||
    updatedAt ||
    user?.updatedAt ||
    null;

  const resolvedUrl = normalizeUserAvatarUrl(rawAvatar, rawVersion);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [resolvedUrl]);

  const sz = sizeStyles[size];
  const initials = getUserInitials(effectiveName, effectiveUsername);
  const showImage = Boolean(resolvedUrl) && !imgError;
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <div
      data-testid="user-avatar"
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <div
        className={`${sz.container} ${shapeClass} bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 font-bold overflow-hidden shadow-2xs relative`}
      >
        {showImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={resolvedUrl!}
            alt={effectiveName || effectiveUsername || 'User Avatar'}
            loading={priority ? 'eager' : 'lazy'}
            onError={() => {
              setImgError(true);
            }}
            className="w-full h-full object-cover"
          />
        ) : showFallback ? (
          <span className={`${sz.text} font-bold tracking-tight`}>{initials}</span>
        ) : (
          <UserIcon className={`${sz.icon} text-blue-400`} />
        )}
      </div>

      {status && (
        <span
          className={`absolute bottom-0 right-0 ${sz.dot} ${statusColors[status]} rounded-full ring-2 ring-white`}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}
