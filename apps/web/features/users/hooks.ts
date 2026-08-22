'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from './api';
import { useRealtime } from '../../hooks/useRealtime';
import type { UserFormPayload } from './types';

export const userQueryKeys = {
  all: ['users'] as const,
  list: () => ['users', 'list'] as const,
  presences: () => ['users', 'presences'] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
  effectivePermissions: (id: string) => ['users', 'effective-permissions', id] as const
};

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
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      if (payload?.userId) {
        queryClient.invalidateQueries({ queryKey: userQueryKeys.detail(payload.userId) });
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
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
      if (data?.user?.id) {
        queryClient.invalidateQueries({ queryKey: userQueryKeys.detail(data.user.id) });
      }
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    }
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
