'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from './api';
import { useRealtime } from '../../hooks/useRealtime';
import type { RolePermissionsMatrix } from './types';

export const permissionQueryKeys = {
  all: ['role-permissions'] as const,
  matrix: () => ['role-permissions', 'matrix'] as const
};

export function useRolePermissionsQuery() {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: permissionQueryKeys.matrix(),
    queryFn: () => permissionsApi.getRolePermissions(),
    staleTime: 60 * 1000
  });

  useEffect(() => {
    const unsub = subscribe('rbac_updated', () => {
      queryClient.invalidateQueries({ queryKey: permissionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['auth', 'permissions'] });
    });

    return () => {
      unsub();
    };
  }, [subscribe, queryClient]);

  return query;
}

export function useSaveRolePermissionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matrix: RolePermissionsMatrix) => permissionsApi.saveRolePermissions(matrix),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['auth', 'permissions'] });
    }
  });
}
