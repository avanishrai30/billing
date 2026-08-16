export interface RolePermissionsMatrix {
  admin: string[];
  employee: string[];
  auditor: string[];
}

export type MatrixRole = 'admin' | 'employee' | 'auditor';

export interface PermissionDefinition {
  id: string;
  name: string;
  description: string;
  module: string;
}

export interface PermissionModuleGroup {
  id: string;
  title: string;
  description: string;
  permissions: PermissionDefinition[];
}
