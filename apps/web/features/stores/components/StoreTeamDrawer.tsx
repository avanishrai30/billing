'use client';

import React, { useState } from 'react';
import { UserCheck, UserPlus, Trash2, Shield, Mail, Phone, Store } from 'lucide-react';
import {
  Drawer,
  Button,
  Badge,
  UserAvatar,
  EmptyState,
  Select,
  useToast
} from '../../../components/ui';
import { useStoreEmployeesQuery, useAddStoreEmployeeMutation, useRemoveStoreEmployeeMutation } from '../hooks';
import { useUsersQuery } from '../../users/hooks';
import type { StoreDoc } from '../types';

export interface StoreTeamDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreDoc | null;
  canManage?: boolean;
}

export function StoreTeamDrawer({
  isOpen,
  onClose,
  store,
  canManage = false
}: StoreTeamDrawerProps) {
  const { success, error } = useToast();
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const { data: employees = [], isLoading: isLoadingEmployees } = useStoreEmployeesQuery(store?.id);
  const { data: allUsers = [] } = useUsersQuery();

  const addEmployeeMutation = useAddStoreEmployeeMutation();
  const removeEmployeeMutation = useRemoveStoreEmployeeMutation();

  if (!store) return null;

  // Find eligible users not already assigned to this store
  const eligibleUsers = allUsers.filter(u => {
    if (u.status === 'inactive') return false;
    const assigned = Array.isArray(u.assignedStores) && u.assignedStores.length > 0
      ? u.assignedStores
      : (u.assignedStoreId ? [u.assignedStoreId] : []);
    return !assigned.includes(store.id);
  });

  const handleAddEmployee = async () => {
    if (!selectedUserIdToAdd) {
      error('Selection Required', 'Please select an employee to assign to this store.');
      return;
    }

    try {
      await addEmployeeMutation.mutateAsync({
        storeId: store.id,
        userId: selectedUserIdToAdd
      });
      success('Employee Assigned', 'The team member has been assigned to this store outlet.');
      setSelectedUserIdToAdd('');
      setIsAdding(false);
    } catch (err: any) {
      error('Assignment Failed', err.message || 'Could not assign employee to store.');
    }
  };

  const handleRemoveEmployee = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to unassign @${username} from ${store.name}?`)) {
      return;
    }

    try {
      await removeEmployeeMutation.mutateAsync({
        storeId: store.id,
        userId
      });
      success('Employee Removed', `@${username} has been unassigned from ${store.name}.`);
    } catch (err: any) {
      error('Removal Failed', err.message || 'Could not unassign employee from store.');
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`${store.name} — Team Members`}
      description={`Assigned personnel and operational employees for ${store.code || store.name}`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-500 font-mono">
            {employees.length} {employees.length === 1 ? 'employee' : 'employees'} assigned
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Drawer
          </Button>
        </div>
      }
    >
      <div className="space-y-6 py-2">
        {/* Store Summary Banner */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">{store.name}</h4>
              <p className="text-[11px] text-slate-500 font-mono">{store.code} • {store.address || 'Standard Outlet'}</p>
            </div>
          </div>
          {store.isHub && (
            <Badge variant="brand" dot>
              DISTRIBUTION HUB
            </Badge>
          )}
        </div>

        {/* Add Employee Form Section */}
        {canManage && (
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-blue-600" />
                Assign Team Member
              </h4>
              {!isAdding && (
                <Button size="sm" variant="primary" onClick={() => setIsAdding(true)}>
                  + Assign Employee
                </Button>
              )}
            </div>

            {isAdding && (
              <div className="space-y-3 pt-2">
                <Select
                  aria-label="Select Team Member to Assign"
                  value={selectedUserIdToAdd}
                  onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                  options={[
                    { value: '', label: '— Select Active Employee —' },
                    ...eligibleUsers.map(u => ({
                      value: u.id,
                      label: `${u.name} (@${u.username}) • ${u.role}`
                    }))
                  ]}
                  className="text-xs"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setSelectedUserIdToAdd(''); }}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!selectedUserIdToAdd}
                    isLoading={addEmployeeMutation.isPending}
                    onClick={handleAddEmployee}
                  >
                    Confirm Assignment
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assigned Employees List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Assigned Personnel ({employees.length})
          </h4>

          {isLoadingEmployees ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <EmptyState
              icon={<UserCheck className="w-8 h-8 text-slate-400" />}
              title="No Team Members Assigned"
              description="There are currently zero employees assigned to operate in this store outlet."
            />
          ) : (
            <div className="space-y-2">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar user={emp} size="md" shape="circle" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                          {emp.name}
                        </span>
                        <code className="text-[10px] text-blue-700 bg-blue-50 px-1 py-0.2 rounded font-mono">
                          @{emp.username}
                        </code>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                        <span>{emp.role}</span>
                        {emp.email && <span>• {emp.email}</span>}
                        {emp.phone && <span>• {emp.phone}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={emp.category === 'admin' ? 'info' : 'neutral'}>
                      {emp.category?.toUpperCase()}
                    </Badge>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Unassign ${emp.name} from store`}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1.5"
                        isLoading={removeEmployeeMutation.isPending}
                        onClick={() => handleRemoveEmployee(emp.id, emp.username)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
