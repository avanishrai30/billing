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
  Building2,
  Store,
  Network,
  ShieldAlert,
  History,
  Settings,
  Palette,
  X,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePublicSettings } from '../../hooks/usePublicSettings';
import { normalizePublicAssetUrl } from '../../lib/utils/media';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { label: 'POS Terminal', href: '/pos', icon: ShoppingCart, permission: 'invoices.create' },
  { label: 'Product Master', href: '/products', icon: Package, permission: 'products.view' },
  { label: 'Inventory', href: '/inventory', icon: Boxes, permission: 'inventory.view' },
  { label: 'Purchases', href: '/purchases', icon: Truck, permission: 'purchases.view' },
  { label: 'Invoices', href: '/invoices', icon: Receipt, permission: 'invoices.view' },
  { label: 'Tax & GST', href: '/tax', icon: Landmark, permission: 'invoices.view' },
  { label: 'Customers', href: '/customers', icon: Users, permission: 'customers.view' },
  { label: 'Suppliers', href: '/suppliers', icon: Building2, permission: 'suppliers.view' },
  { label: 'Outlets', href: '/stores', icon: Store, permission: 'stores.view' },
  { label: 'Franchise', href: '/franchises', icon: Network, permission: 'franchise.view' },
  { label: 'Users', href: '/users', icon: ShieldCheck, permission: 'users.view' },
  { label: 'Roles & Access', href: '/permissions', icon: ShieldAlert, permission: 'roles.view' },
  { label: 'Audit Trail', href: '/audit', icon: History, permission: 'audit.view' },
  { label: 'Settings', href: '/settings', icon: Settings, permission: 'settings.view' },
  { label: 'Design System', href: '/design-system', icon: Palette, permission: 'dashboard.view' }
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const { data: branding } = usePublicSettings();
  const [logoFailed, setLogoFailed] = useState(false);

  const brandTitle = branding?.title || 'AIAVRO Billing OS';
  const brandLogoUrl = normalizePublicAssetUrl(branding?.logo);
  const showLogoImage = !!brandLogoUrl && !logoFailed;

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          data-testid="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        data-testid="sidebar-container"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-xs flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-blue-600 flex-shrink-0 overflow-hidden">
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
            <span className="font-semibold text-sm text-slate-900 truncate">{brandTitle}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="lg:hidden text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose()}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs border-l-2 border-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>AIAVRO v2.0 Enterprise</span>
          <span className="text-[10px] text-slate-400 font-mono">PROD</span>
        </div>
      </aside>
    </>
  );
}
