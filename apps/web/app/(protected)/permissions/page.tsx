'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import {
  useRolePermissionsQuery,
  useSaveRolePermissionsMutation,
  PermissionHeader,
  PermissionMatrix,
  type RolePermissionsMatrix
} from '../../../features/permissions';
import { AccessDeniedState } from '../../../components/ui';

export default function PermissionsPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const canView = hasPermission('roles.view');
  const canUpdate = hasPermission('roles.update');

  const { data: serverMatrix, isLoading } = useRolePermissionsQuery();
  const saveMutation = useSaveRolePermissionsMutation();

  // Local draft state for permissions editing
  const [draftMatrix, setDraftMatrix] = useState<RolePermissionsMatrix>({
    admin: [],
    employee: [],
    auditor: []
  });

  // Sync draft state with server when loaded or updated via realtime
  useEffect(() => {
    if (serverMatrix) {
      setDraftMatrix({
        admin: serverMatrix.admin || [],
        employee: serverMatrix.employee || [],
        auditor: serverMatrix.auditor || []
      });
    }
  }, [serverMatrix]);

  // Check if draft has unsaved changes compared to serverMatrix
  const hasChanges = React.useMemo(() => {
    if (!serverMatrix) return false;
    const sAdm = [...(serverMatrix.admin || [])].sort().join(',');
    const dAdm = [...(draftMatrix.admin || [])].sort().join(',');
    const sEmp = [...(serverMatrix.employee || [])].sort().join(',');
    const dEmp = [...(draftMatrix.employee || [])].sort().join(',');
    const sAud = [...(serverMatrix.auditor || [])].sort().join(',');
    const dAud = [...(draftMatrix.auditor || [])].sort().join(',');
    return sAdm !== dAdm || sEmp !== dEmp || sAud !== dAud;
  }, [serverMatrix, draftMatrix]);

  if (!canView) {
    return (
      <AccessDeniedState
        title="Role Permissions Restricted"
        message="You do not have administrative privileges to inspect or modify the RBAC role permissions matrix."
        requiredPermission="roles.view"
      />
    );
  }

  const handleSave = async () => {
    await saveMutation.mutateAsync(draftMatrix);
  };

  const handleReset = () => {
    if (serverMatrix) {
      setDraftMatrix({
        admin: serverMatrix.admin || [],
        employee: serverMatrix.employee || [],
        auditor: serverMatrix.auditor || []
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PermissionHeader
        hasChanges={hasChanges}
        canUpdate={canUpdate}
        onSave={handleSave}
        onReset={handleReset}
        isLoading={saveMutation.isPending}
      />

      {/* Super Admin Notice Banner */}
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl text-xs text-slate-700 shadow-xs">
        <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-slate-950 font-semibold">Super Admin Master Bypass Policy</strong>
          <p className="text-slate-600 leading-relaxed">
            The <strong className="text-slate-900">Super Admin / Owner</strong> role retains permanent wildcard access (<code className="rounded border border-indigo-100 bg-white px-1 text-indigo-700">*</code>) across
            all system features, store scopes, and operational commands. The RBAC matrix below configures permissions
            for <strong className="text-slate-900">Admin</strong>, <strong className="text-slate-900">Employee / Cashier</strong>, and <strong className="text-slate-900">Auditor</strong> roles.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-sm shadow-xs">
          Loading RBAC permissions matrix...
        </div>
      ) : (
        <PermissionMatrix
          matrix={draftMatrix}
          canUpdate={canUpdate}
          onChangeMatrix={setDraftMatrix}
        />
      )}
    </div>
  );
}
