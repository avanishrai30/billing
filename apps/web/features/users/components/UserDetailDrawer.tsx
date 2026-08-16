'use client';

import React from 'react';
import { User, Shield, Store, Mail, Phone, Calendar, Key, UserX, Edit2 } from 'lucide-react';
import {
  Drawer,
  Button,
  Badge
} from '../../../components/ui';
import type { UserDoc } from '../types';
import type { StoreDoc } from '../../stores/types';

export interface UserDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserDoc | null;
  stores: StoreDoc[];
  canManage: boolean;
  onEdit: (user: UserDoc) => void;
  onDeactivate: (user: UserDoc) => void;
}

export function UserDetailDrawer({
  isOpen,
  onClose,
  user,
  stores,
  canManage,
  onEdit,
  onDeactivate
}: UserDetailDrawerProps) {
  if (!user) return null;

  const storeObj = user.assignedStoreId && user.assignedStoreId !== 'all'
    ? stores.find((s) => s.id === user.assignedStoreId)
    : null;

  const categoryVariant =
    user.category === 'super admin'
      ? 'brand'
      : user.category === 'admin'
      ? 'info'
      : user.category === 'auditor'
      ? 'warning'
      : 'neutral';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={user.name}
      description={`@${user.username} • ${user.role}`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          {canManage ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(user)}
                leftIcon={<Edit2 className="h-4 w-4" />}
              >
                Edit Account
              </Button>
              {user.status === 'active' && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onDeactivate(user)}
                  leftIcon={<UserX className="h-4 w-4" />}
                >
                  Suspend User
                </Button>
              )}
            </div>
          ) : (
            <div />
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6 py-2 overflow-y-auto">
        {/* Status and Role Pill */}
        <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Account Status:</span>
            <Badge variant={user.status === 'active' ? 'success' : 'danger'} dot>
              {user.status.toUpperCase()}
            </Badge>
          </div>
          <Badge variant={categoryVariant}>
            {user.category?.toUpperCase() || 'EMPLOYEE'}
          </Badge>
        </div>

        {/* User Profile Card */}
        <div className="bg-[#001845] p-4 rounded-xl border border-white/10 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Identity & Contact Details
          </h4>
          <div className="grid grid-cols-1 gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <User className="h-4 w-4 text-slate-400" />
              <span>
                Full Name: <strong className="text-white">{user.name}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Key className="h-4 w-4 text-slate-400" />
              <span>
                Username: <code className="text-sky-300 font-mono">@{user.username}</code>
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="h-4 w-4 text-slate-400" />
              <span>
                Email: <strong className="text-white">{user.email || 'None registered'}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>
                Phone: <strong className="text-white">{user.phone || 'None registered'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Store Scoping Card */}
        <div className="bg-[#001845] p-4 rounded-xl border border-white/10 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Store Scope Privileges
          </h4>
          <div className="text-xs space-y-2">
            {user.assignedStoreId === 'all' || !user.assignedStoreId ? (
              <div className="flex items-center gap-2 text-emerald-300 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                <span>🌐</span>
                <div>
                  <strong>All-Store Master Enterprise Access</strong>
                  <p className="text-[11px] text-emerald-400/80 mt-0.5">
                    User is permitted to switch between all branches and query global data.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                <Store className="h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <strong>Restricted to Branch: {storeObj?.name || user.assignedStoreId}</strong>
                  <p className="text-[11px] text-amber-400/80 mt-0.5">
                    User operations (sales, checkouts, stock reads) are automatically scoped to this store.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Security Metadata */}
        <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Created On:
            </span>
            <span className="text-white font-mono">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Active Session Token Version:
            </span>
            <span className="text-white font-mono">v{user.tokenVersion ?? 1}</span>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
