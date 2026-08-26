'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from './api';
import { useRealtime } from '../../hooks/useRealtime';
import type { UserDoc, UserEffectivePermissions, UserFormPayload } from './types';

export const userQueryKeys = {
  all: ['users'] as const,
  list: () => ['users', 'list'] as const,
  presences: () => ['users', 'presences'] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
  effectivePermissions: (id: string) => ['users', 'effective-permissions', id] as const,
  myActivity: () => ['users', 'me', 'activity'] as const
};

function getUserUpdatedAt(user?: Pick<UserDoc, 'updatedAt' | 'createdAt'> | null) {
  const raw = user?.updatedAt || user?.createdAt;
  const parsed = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function shouldApplyUserPatch(
  current: Pick<UserDoc, 'updatedAt' | 'createdAt'> | undefined | null,
  incoming: Pick<UserDoc, 'updatedAt' | 'createdAt'>
) {
  const incomingTime = getUserUpdatedAt(incoming);
  const currentTime = getUserUpdatedAt(current);
  return incomingTime === 0 || currentTime === 0 || incomingTime >= currentTime;
}

export function patchUserListCache(current: UserDoc[] | undefined, incoming: UserDoc) {
  if (!current) return current;
  let found = false;
  const next = current.map((user) => {
    if (user.id !== incoming.id) return user;
    found = true;
    return shouldApplyUserPatch(user, incoming) ? { ...user, ...incoming } : user;
  });
  return found ? next : [incoming, ...next];
}

export function patchUserEffectivePermissionsCache(
  current: UserEffectivePermissions | undefined,
  incoming: UserDoc
) {
  if (!current || current.userId !== incoming.id) return current;
  return {
    ...current,
    category: incoming.category,
    permissionGrants: incoming.permissionGrants || current.permissionGrants || [],
    permissionDenies: incoming.permissionDenies || current.permissionDenies || []
  };
}

function applyAuthoritativeUserToCache(queryClient: ReturnType<typeof useQueryClient>, incoming?: UserDoc | null) {
  if (!incoming?.id) return;

  queryClient.setQueryData<UserDoc[]>(userQueryKeys.list(), (current) => patchUserListCache(current, incoming));
  queryClient.setQueryData<UserDoc>(userQueryKeys.detail(incoming.id), (current) => {
    if (current && !shouldApplyUserPatch(current, incoming)) return current;
    return current ? { ...current, ...incoming } : incoming;
  });
  queryClient.setQueryData<UserEffectivePermissions>(
    userQueryKeys.effectivePermissions(incoming.id),
    (current) => patchUserEffectivePermissionsCache(current, incoming)
  );
}

export function useUsersQuery() {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: userQueryKeys.list(),
    queryFn: () => userApi.getUsers(),
    staleTime: 60 * 1000
  });

  useEffect(() => {
    const unsub = subscribe('user_updated', (payload: any) => {
      const incomingUser = payload?.user || payload?.data?.user;
      if (incomingUser?.id) {
        applyAuthoritativeUserToCache(queryClient, incomingUser);
      } else if (payload?.userId && (payload?.avatar !== undefined || payload?.avatarUpdatedAt !== undefined)) {
        queryClient.setQueryData<UserDoc[]>(userQueryKeys.list(), (current) => {
          if (!current) return current;
          return current.map((u) =>
            u.id === payload.userId
              ? { ...u, avatar: payload.avatar, avatarUpdatedAt: payload.avatarUpdatedAt }
              : u
          );
        });
      }

      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      const targetUserId = payload?.userId || payload?.data?.userId || incomingUser?.id;
      if (targetUserId) {
        queryClient.invalidateQueries({ queryKey: userQueryKeys.detail(targetUserId) });
        queryClient.invalidateQueries({ queryKey: userQueryKeys.effectivePermissions(targetUserId) });
      }
    });

    return () => {
      unsub();
    };
  }, [subscribe, queryClient]);

  return query;
}

export function useUserPresencesQuery() {
  return useQuery({
    queryKey: userQueryKeys.presences(),
    queryFn: () => userApi.getPresences(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000
  });
}

export function useUserQuery(id?: string) {
  return useQuery({
    queryKey: userQueryKeys.detail(id || ''),
    queryFn: () => userApi.getUserById(id!),
    enabled: Boolean(id),
    staleTime: 60 * 1000
  });
}

export function useUserEffectivePermissionsQuery(id?: string) {
  return useQuery({
    queryKey: userQueryKeys.effectivePermissions(id || ''),
    queryFn: () => userApi.getEffectivePermissions(id!),
    enabled: Boolean(id),
    staleTime: 60 * 1000
  });
}

export function useSaveUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UserFormPayload) => userApi.saveUser(payload),
    onSuccess: (data) => {
      applyAuthoritativeUserToCache(queryClient, data?.user);
      queryClient.invalidateQueries({ queryKey: userQueryKeys.list() });
      if (data?.user?.id) {
        queryClient.invalidateQueries({ queryKey: userQueryKeys.detail(data.user.id) });
        queryClient.invalidateQueries({ queryKey: userQueryKeys.effectivePermissions(data.user.id) });
      }
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    }
  });
}

export function useSaveUserPermissionOverridesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      permissionGrants,
      permissionDenies
    }: {
      id: string;
      permissionGrants: string[];
      permissionDenies: string[];
    }) => userApi.savePermissionOverrides(id, { permissionGrants, permissionDenies }),
    onSuccess: (data) => {
      applyAuthoritativeUserToCache(queryClient, data?.user);
      queryClient.invalidateQueries({ queryKey: userQueryKeys.list() });
      if (data?.user?.id) {
        queryClient.invalidateQueries({ queryKey: userQueryKeys.detail(data.user.id) });
        queryClient.invalidateQueries({ queryKey: userQueryKeys.effectivePermissions(data.user.id) });
      }
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    }
  });
}

export function useDeactivateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => userApi.deactivateUser(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
      if (data?.user?.id) {
        queryClient.invalidateQueries({ queryKey: userQueryKeys.detail(data.user.id) });
      }
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    }
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name: string; email?: string; phone?: string }) =>
      userApi.updateProfile(payload),
    onSuccess: (data) => {
      if (data?.user) {
        applyAuthoritativeUserToCache(queryClient, data.user);
      }
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
      if (data?.user?.id) {
        queryClient.invalidateQueries({ queryKey: userQueryKeys.detail(data.user.id) });
      }
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    }
  });
}

export function useUploadAvatarMutation() {
  return useMutation({
    mutationFn: ({ fileName, base64Data }: { fileName: string; base64Data: string }) =>
      userApi.uploadAvatar(fileName, base64Data)
  });
}

export function useUpdateAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (avatar: string | null) => userApi.updateAvatar(avatar),
    onSuccess: (data) => {
      if (data?.user) {
        applyAuthoritativeUserToCache(queryClient, data.user);
      }
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    }
  });
}

export function useMyActivityQuery() {
  return useQuery({
    queryKey: userQueryKeys.myActivity(),
    queryFn: () => userApi.getMyActivity(),
    staleTime: 60 * 1000
  });
}

export function useChangePasswordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      userApi.changePassword(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    }
  });
}
