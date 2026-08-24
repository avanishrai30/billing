'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Receipt,
  Landmark,
  Users,
  UserCircle,
  Building2,
  Store,
  Network,
  ShieldAlert,
  History,
  Settings,
  Palette,
  X,
  ShieldCheck,
  Eraser
} from 'lucide-react';
import { useAuthorization } from '../../hooks/useAuthorization';
import { useAuth } from '../../hooks/useAuth';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import { normalizePublicAssetUrl } from '../../lib/utils/media';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  superAdminOnly?: boolean;
  group: 'Operate' | 'Trade' | 'Network' | 'Control';
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view', group: 'Operate' },
  { label: 'POS Terminal', href: '/pos', icon: ShoppingCart, permission: 'invoices.create', group: 'Operate' },
  { label: 'Product Master', href: '/products', icon: Package, permission: 'products.view', group: 'Operate' },
  { label: 'Inventory', href: '/inventory', icon: Boxes, permission: 'inventory.view', group: 'Operate' },
  { label: 'Purchases', href: '/purchases', icon: Truck, permission: 'purchases.view', group: 'Trade' },
  { label: 'Invoices', href: '/invoices', icon: Receipt, permission: 'invoices.view', group: 'Trade' },
  { label: 'Tax & GST', href: '/tax', icon: Landmark, permission: 'invoices.view', group: 'Trade' },
  { label: 'Customers', href: '/customers', icon: Users, permission: 'customers.view', group: 'Network' },
  { label: 'Suppliers', href: '/suppliers', icon: Building2, permission: 'suppliers.view', group: 'Network' },
  { label: 'Outlets', href: '/stores', icon: Store, permission: 'stores.view', group: 'Network' },
  { label: 'Franchise', href: '/franchises', icon: Network, permission: 'franchise.view', group: 'Network' },
  { label: 'My Profile', href: '/profile', icon: UserCircle, group: 'Control' },
  { label: 'Users', href: '/users', icon: ShieldCheck, permission: 'users.view', group: 'Control' },
  { label: 'Roles & Access', href: '/permissions', icon: ShieldAlert, permission: 'roles.view', group: 'Control' },
  { label: 'Audit Trail', href: '/audit', icon: History, permission: 'audit.view', group: 'Control' },
  { label: 'Cleanup & Maint.', href: '/admin/cleanup', icon: Eraser, superAdminOnly: true, group: 'Control' },
  { label: 'Settings', href: '/settings', icon: Settings, permission: 'settings.view', group: 'Control' },
  { label: 'Design System', href: '/design-system', icon: Palette, permission: 'dashboard.view', group: 'Control' }
];

const NAV_GROUPS: NavItem['group'][] = ['Operate', 'Trade', 'Network', 'Control'];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { can } = useAuthorization();
  const { user } = useAuth();
  const { data: branding } = usePublicSettings();
  const [logoFailed, setLogoFailed] = useState(false);

  const isSuperAdmin =
    user?.category?.toLowerCase() === 'super admin' ||
    user?.category?.toLowerCase() === 'owner' ||
    user?.role?.toUpperCase() === 'SUPER ADMIN';

  const brandTitle = branding?.title || 'AIAVRO Billing OS';
  const brandLogoUrl = normalizePublicAssetUrl(branding?.logo);
  const showLogoImage = !!brandLogoUrl && !logoFailed;

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (!item.permission) return true;
    return can(item.permission);
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          data-testid="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        data-testid="sidebar-container"
        className={`fixed top-0 bottom-0 left-0 z-50 w-[17rem] bg-white border-r border-slate-200/80 shadow-[8px_0_32px_rgba(15,23,42,0.04)] flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-[68px] px-4 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0 overflow-hidden shadow-[0_6px_16px_rgba(37,99,235,0.08)]">
              {showLogoImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={brandLogoUrl!}
                  alt={brandTitle}
                  className="w-6 h-6 object-contain"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-sm text-slate-950 truncate block">{brandTitle}</span>
              <span className="text-[11px] text-slate-500">Enterprise billing workspace</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="lg:hidden text-slate-500 hover:text-slate-900 p-1.5 rounded-md hover:bg-slate-100 cursor-pointer focus-ring"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto" aria-label="Primary navigation">
          {NAV_GROUPS.map((group) => {
            const groupItems = visibleNavItems.filter((item) => item.group === group);
            if (groupItems.length === 0) return null;

            return (
              <div key={group} className="py-2 first:pt-0">
                <div className="px-3 pb-1.5 text-[10px] font-semibold text-slate-400">
                  {group}
                </div>
                <div className="space-y-1">
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onClose()}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors focus-ring ${
                          isActive
                            ? 'bg-blue-50 text-blue-800 font-semibold border border-blue-100 shadow-[0_8px_20px_rgba(37,99,235,0.08)]'
                            : 'text-slate-600 border border-transparent hover:bg-slate-50 hover:text-slate-950'
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-slate-200/80 text-[11px] text-slate-500">
          <span>Secured by role and store scope</span>
        </div>
      </aside>
    </>
  );
}
