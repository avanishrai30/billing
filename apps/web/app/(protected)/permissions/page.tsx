'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import {
  useRolePermissionsQuery,
  useSaveRolePermissionsMutation,
  PermissionHeader,
  PermissionMatrix,
  type RolePermissionsMatrix
} from '../../../features/permissions';

export default function PermissionsPage() {
  const { user: currentUser, hasPermission } = useAuth();
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
      <div className="flex items-start gap-3 bg-purple-500/10 border border-purple-500/20 p-3.5 rounded-xl text-xs text-purple-200">
        <ShieldCheck className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-white font-semibold">Super Admin Master Bypass Policy</strong>
          <p className="text-purple-300/80 leading-relaxed">
            The <strong>Super Admin / Owner</strong> role retains permanent wildcard access (<code>*</code>) across
            all system features, store scopes, and operational commands. The RBAC matrix below configures permissions
            for <strong>Admin</strong>, <strong>Employee / Cashier</strong>, and <strong>Auditor</strong> roles.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#021b47] border border-white/10 rounded-2xl p-6 text-center text-slate-400 text-sm">
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
