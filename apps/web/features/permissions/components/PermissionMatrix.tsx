'use client';

import React from 'react';
import { RoleTabs } from './RoleTabs';
import { PermissionGroup } from './PermissionGroup';
import type { RolePermissionsMatrix, MatrixRole, PermissionModuleGroup } from '../types';

export const PERMISSION_MODULE_GROUPS: PermissionModuleGroup[] = [
  {
    id: 'dashboard',
    title: 'Executive Dashboard & Intelligence',
    description: 'Overview KPIs, real-time sales summaries, profit margins, and inventory asset valuation',
    permissions: [
      {
        id: 'dashboard.view',
        name: 'View Executive Dashboard',
        description: 'Allows reading executive dashboard KPIs, sales charts, and operational summaries',
        module: 'dashboard'
      }
    ]
  },
  {
    id: 'pos',
    title: 'POS Terminal, Checkouts & Sales',
    description: 'Cashier checkout terminal, barcode scanning, discount authorization, and receipt printing',
    permissions: [
      {
        id: 'invoices.create',
        name: 'Create POS Invoices / Checkout',
        description: 'Allows ringing up carts and completing sales checkout transactions',
        module: 'pos'
      },
      {
        id: 'invoices.view',
        name: 'View Sales Invoices Ledger',
        description: 'Allows browsing historical sales receipts and customer invoices',
        module: 'pos'
      },
      {
        id: 'invoices.print',
        name: 'Print Thermal & PDF Receipts',
        description: 'Allows generating and downloading thermal receipts or tax invoices',
        module: 'pos'
      },
      {
        id: 'invoices.void',
        name: 'Void & Reverse Invoices',
        description: 'Allows reversing/voiding finalized sales transactions and adjusting stock',
        module: 'pos'
      },
      {
        id: 'scanner.use',
        name: 'Use Hardware & Camera Barcode Scanner',
        description: 'Allows pairing and scanning barcodes via camera or Bluetooth hardware',
        module: 'pos'
      }
    ]
  },
  {
    id: 'products',
    title: 'Product Master Catalog & Pricing',
    description: 'Product definitions, barcodes, selling prices, cost prices, GST rates, and bulk imports',
    permissions: [
      {
        id: 'products.view',
        name: 'View Product Master Catalog',
        description: 'Allows browsing product catalog, search, and stock level details',
        module: 'products'
      },
      {
        id: 'products.create',
        name: 'Create New Products',
        description: 'Allows creating product master items and generating SKUs/barcodes',
        module: 'products'
      },
      {
        id: 'products.update',
        name: 'Edit Product Details & Prices',
        description: 'Allows updating selling prices, cost prices, GST rates, and descriptions',
        module: 'products'
      },
      {
        id: 'products.archive',
        name: 'Archive / Delete Products',
        description: 'Allows archiving discontinued catalog items',
        module: 'products'
      },
      {
        id: 'products.import.preview',
        name: 'Preview Excel / CSV Product Imports',
        description: 'Allows uploading spreadsheets for data preview before commit',
        module: 'products'
      },
      {
        id: 'products.import.commit',
        name: 'Commit Bulk Product Imports',
        description: 'Allows committing bulk spreadsheet imports directly to the database',
        module: 'products'
      }
    ]
  },
  {
    id: 'inventory',
    title: 'Central Stock & Inventory Movement',
    description: 'Store balance tracking, manual stock adjustments, and inter-branch transfers',
    permissions: [
      {
        id: 'inventory.view',
        name: 'View Stock Balances & Movements',
        description: 'Allows inspecting current inventory levels and historical movement ledger',
        module: 'inventory'
      },
      {
        id: 'inventory.adjust',
        name: 'Adjust Stock Balances',
        description: 'Allows recording physical audit corrections, damages, and write-offs',
        module: 'inventory'
      },
      {
        id: 'inventory.transfer',
        name: 'Inter-Branch Stock Transfers',
        description: 'Allows initiating and approving stock dispatches between store locations',
        module: 'inventory'
      }
    ]
  },
  {
    id: 'purchases',
    title: 'Supplier Purchases & Stock Inwarding',
    description: 'Inbound procurement invoices, supplier bills, transport charges, and purchase voids',
    permissions: [
      {
        id: 'purchases.view',
        name: 'View Procurement Purchase Ledger',
        description: 'Allows browsing historical supplier purchase entries and inwarded goods',
        module: 'purchases'
      },
      {
        id: 'purchases.create',
        name: 'Create Inward Purchase Entry',
        description: 'Allows inwarding new vendor stock shipments and recording purchase invoices',
        module: 'purchases'
      },
      {
        id: 'purchases.void',
        name: 'Void Purchase Invoices',
        description: 'Allows reversing purchase invoices and rolling back inwarded stock',
        module: 'purchases'
      }
    ]
  },
  {
    id: 'crm',
    title: 'Customer CRM & Loyalty',
    description: 'Customer contact directory, GSTIN profiles, purchase histories, and credit tracking',
    permissions: [
      {
        id: 'customers.view',
        name: 'View Customer CRM Directory',
        description: 'Allows viewing customer contact profiles and historical transaction summaries',
        module: 'crm'
      },
      {
        id: 'customers.create',
        name: 'Register New Customers',
        description: 'Allows creating new customer records during checkout or from directory',
        module: 'crm'
      },
      {
        id: 'customers.update',
        name: 'Edit Customer Profiles',
        description: 'Allows updating phone numbers, emails, addresses, and GSTIN numbers',
        module: 'crm'
      },
      {
        id: 'customers.delete',
        name: 'Delete Customer Profiles',
        description: 'Allows permanently removing customer profiles from directory',
        module: 'crm'
      }
    ]
  },
  {
    id: 'suppliers',
    title: 'Vendor & Supplier Management',
    description: 'Supplier profiles, vendor payment details, procurement histories, and GSTINs',
    permissions: [
      {
        id: 'suppliers.view',
        name: 'View Supplier Directory',
        description: 'Allows viewing vendor contact info and purchase histories',
        module: 'suppliers'
      },
      {
        id: 'suppliers.create',
        name: 'Register New Suppliers',
        description: 'Allows creating vendor business profiles and payment contacts',
        module: 'suppliers'
      },
      {
        id: 'suppliers.update',
        name: 'Edit Supplier Details',
        description: 'Allows editing vendor contact info, bank details, and GSTINs',
        module: 'suppliers'
      },
      {
        id: 'suppliers.delete',
        name: 'Delete Supplier Profiles',
        description: 'Allows removing vendor profiles from the active directory',
        module: 'suppliers'
      }
    ]
  },
  {
    id: 'stores',
    title: 'Retail Store Outlets & Branches',
    description: 'Branch outlet management, location codes, and store scoping configurations',
    permissions: [
      {
        id: 'stores.view',
        name: 'View Store Outlets Directory',
        description: 'Allows browsing branch outlets and location details',
        module: 'stores'
      },
      {
        id: 'stores.create',
        name: 'Create Store Outlets',
        description: 'Allows creating new retail store branches and assigning store codes',
        module: 'stores'
      },
      {
        id: 'stores.update',
        name: 'Edit Store Branch Details',
        description: 'Allows updating branch names, contact details, and locations',
        module: 'stores'
      },
      {
        id: 'stores.delete',
        name: 'Delete Store Branches',
        description: 'Allows decommissioning branch outlets from the store directory',
        module: 'stores'
      }
    ]
  },
  {
    id: 'franchise',
    title: 'Franchise CRM & Supply Chain',
    description: 'External franchise partners, wholesale pricing agreements, and supply dispatches',
    permissions: [
      {
        id: 'franchise.view',
        name: 'View Franchise Directory & Supply Ledger',
        description: 'Allows browsing franchise partner profiles and supply order dispatches',
        module: 'franchise'
      },
      {
        id: 'franchise.manage',
        name: 'Manage Franchises & Record Supply Dispatches',
        description: 'Allows creating partner agreements, wholesale catalogs, and supply dispatches',
        module: 'franchise'
      }
    ]
  },
  {
    id: 'users',
    title: 'User Accounts & Roles Administration',
    description: 'User registration, role assignments, store scoping, and RBAC matrix updates',
    permissions: [
      {
        id: 'users.view',
        name: 'View User Directory',
        description: 'Allows viewing team member accounts and assigned roles',
        module: 'users'
      },
      {
        id: 'users.create',
        name: 'Register User Accounts',
        description: 'Allows creating new login credentials and assigning initial roles',
        module: 'users'
      },
      {
        id: 'users.update',
        name: 'Edit User Accounts & Store Scope',
        description: 'Allows updating roles, credentials, and store scoping assignments',
        module: 'users'
      },
      {
        id: 'users.deactivate',
        name: 'Suspend / Deactivate User Accounts',
        description: 'Allows suspending users and revoking active browser sessions',
        module: 'users'
      },
      {
        id: 'roles.view',
        name: 'View RBAC Permissions Matrix',
        description: 'Allows inspecting the role-based access control matrix',
        module: 'users'
      },
      {
        id: 'roles.update',
        name: 'Update RBAC Permissions Matrix',
        description: 'Allows modifying the active permissions granted to Admin, Employee, and Auditor',
        module: 'users'
      }
    ]
  },
  {
    id: 'audit',
    title: 'Security & Immutable Audit Trail',
    description: 'Immutable system audit logs tracking creates, edits, deletions, and security alerts',
    permissions: [
      {
        id: 'audit.view',
        name: 'View System Audit Logs',
        description: 'Allows inspecting immutable audit trail and security authorization logs',
        module: 'audit'
      }
    ]
  },
  {
    id: 'settings',
    title: 'System Settings & Branding',
    description: 'Portal branding logos, enterprise titles, and system configuration backups',
    permissions: [
      {
        id: 'settings.view',
        name: 'View System Settings',
        description: 'Allows viewing system configuration, server health, and branding info',
        module: 'settings'
      },
      {
        id: 'settings.update',
        name: 'Save System Settings & Branding',
        description: 'Allows updating portal titles, logos, and server configuration',
        module: 'settings'
      }
    ]
  }
];

export interface PermissionMatrixProps {
  matrix: RolePermissionsMatrix;
  canUpdate: boolean;
  onChangeMatrix: (newMatrix: RolePermissionsMatrix) => void;
}

export function PermissionMatrix({
  matrix,
  canUpdate,
  onChangeMatrix
}: PermissionMatrixProps) {
  const [activeRole, setActiveRole] = React.useState<MatrixRole>('admin');

  const permissionCounts = React.useMemo(() => {
    return {
      admin: (matrix.admin || []).length,
      employee: (matrix.employee || []).length,
      auditor: (matrix.auditor || []).length
    };
  }, [matrix]);

  const handleTogglePermission = (permissionId: string) => {
    const currentList = matrix[activeRole] || [];
    const isChecked = currentList.includes(permissionId);
    const updatedList = isChecked
      ? currentList.filter((p) => p !== permissionId)
      : [...currentList, permissionId];

    onChangeMatrix({
      ...matrix,
      [activeRole]: updatedList
    });
  };

  const handleToggleGroup = (permissionIds: string[], selectAll: boolean) => {
    const currentList = matrix[activeRole] || [];
    let updatedList: string[];

    if (selectAll) {
      const set = new Set([...currentList, ...permissionIds]);
      updatedList = Array.from(set);
    } else {
      updatedList = currentList.filter((id) => !permissionIds.includes(id));
    }

    onChangeMatrix({
      ...matrix,
      [activeRole]: updatedList
    });
  };

  const selectedForRole = matrix[activeRole] || [];

  return (
    <div className="space-y-4">
      <RoleTabs
        activeRole={activeRole}
        onChangeRole={setActiveRole}
        permissionCounts={permissionCounts}
      />

      <div className="space-y-3">
        {PERMISSION_MODULE_GROUPS.map((group) => (
          <PermissionGroup
            key={group.id}
            group={group}
            selectedPermissions={selectedForRole}
            disabled={!canUpdate}
            onTogglePermission={handleTogglePermission}
            onToggleGroup={handleToggleGroup}
          />
        ))}
      </div>
    </div>
  );
}
