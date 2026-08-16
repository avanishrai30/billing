'use client';

import React from 'react';
import { PlaceholderView } from '../../../components/layout/PlaceholderView';

export default function PermissionsPage() {
  return (
    <PlaceholderView
      title="User Accounts & Role Permissions Matrix"
      description="User management, role assignment, password resets, store scoping, and RBAC matrix updates"
      phase="Phase 13"
      endpoint="/api/v1/role-permissions"
    />
  );
}
