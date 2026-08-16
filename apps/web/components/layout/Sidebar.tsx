'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Receipt,
  Users,
  Building2,
  Store,
  Network,
  ShieldAlert,
  History,
  Settings,
  X,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePublicSettings } from '../../hooks/usePublicSettings';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { label: 'POS Terminal', href: '/pos', icon: ShoppingCart, permission: 'invoices.create' },
  { label: 'Product Master', href: '/products', icon: Package, permission: 'products.view' },
  { label: 'Inventory', href: '/inventory', icon: Boxes, permission: 'inventory.view' },
  { label: 'Purchases', href: '/purchases', icon: Truck, permission: 'purchases.view' },
  { label: 'Invoices', href: '/invoices', icon: Receipt, permission: 'invoices.view' },
  { label: 'Customers', href: '/customers', icon: Users, permission: 'customers.view' },
  { label: 'Suppliers', href: '/suppliers', icon: Building2, permission: 'suppliers.view' },
  { label: 'Outlets', href: '/stores', icon: Store, permission: 'stores.view' },
  { label: 'Franchise', href: '/franchises', icon: Network, permission: 'franchise.view' },
  { label: 'Roles & Access', href: '/permissions', icon: ShieldAlert, permission: 'roles.view' },
  { label: 'Audit Trail', href: '/audit', icon: History, permission: 'audit.view' },
  { label: 'Settings', href: '/settings', icon: Settings, permission: 'settings.view' }
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const { data: branding } = usePublicSettings();

  const brandTitle = branding?.title || 'AIAVRO Billing OS';

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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        data-testid="sidebar-container"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#021b47] border-r border-white/10 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm text-white truncate">{brandTitle}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-white/10 text-[11px] text-slate-400">
          <span>AIAVRO v2.0 Enterprise</span>
        </div>
      </aside>
    </>
  );
}
