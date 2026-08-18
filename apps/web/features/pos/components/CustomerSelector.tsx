'use client';

import React, { useState } from 'react';
import { User, UserPlus, Phone, Check } from 'lucide-react';
import {
  Select,
  Button,
  Dialog,
  FormField,
  Input
} from '../../../components/ui';
import { useCreateCustomerMutation } from '../hooks';
import type { POSCustomer } from '../types';

export interface CustomerSelectorProps {
  customers: POSCustomer[];
  selectedCustomer: POSCustomer | null;
  onSelectCustomer: (customer: POSCustomer | null) => void;
}

export function CustomerSelector({
  customers = [],
  selectedCustomer,
  onSelectCustomer
}: CustomerSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const createCustomerMutation = useCreateCustomerMutation();

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || !cleanPhone) {
      setFormError('Customer Name and Phone Number are required.');
      return;
    }

    try {
      const res = await createCustomerMutation.mutateAsync({
        name: cleanName,
        phone: cleanPhone,
        email: email.trim() || undefined
      });

      if (res.success && res.customer) {
        onSelectCustomer(res.customer);
        setIsModalOpen(false);
        setName('');
        setPhone('');
        setEmail('');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to register customer.');
    }
  };

  const customerOptions = [
    { value: '', label: 'Walk-in / Guest Customer (Default)' },
    ...customers.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.phone || 'No phone'})`
    }))
  ];

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <User className="w-3.5 h-3.5 text-blue-600" />
          <span>Customer & Account</span>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-blue-700 hover:text-blue-800 text-[11px] font-medium flex items-center gap-1 cursor-pointer focus-ring rounded"
        >
          <UserPlus className="w-3 h-3" />
          <span>New Customer</span>
        </button>
      </div>

      <Select
        placeholder="Select customer account..."
        options={customerOptions}
        value={selectedCustomer?.id || ''}
        onChange={(e) => {
          const val = e.target.value;
          const found = customers.find((c) => c.id === val);
          onSelectCustomer(found || null);
        }}
      />

      {selectedCustomer && (
        <div className="flex items-center justify-between text-[11px] bg-white rounded-lg px-2.5 py-1 text-slate-700 border border-slate-200">
          <span className="font-semibold text-slate-950 truncate">{selectedCustomer.name}</span>
          <span className="font-mono text-slate-500">{selectedCustomer.phone}</span>
        </div>
      )}

      {/* Quick Add Customer Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Customer"
        description="Quickly save customer contact details for loyalty and invoice association"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={createCustomerMutation.isPending}
              onClick={handleCreateCustomer}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Save Customer
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3.5">
          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {formError}
            </div>
          )}

          <FormField label="Full Name" required>
            <Input
              placeholder="e.g. Anand Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </FormField>

          <FormField label="Mobile Phone #" required>
            <Input
              placeholder="e.g. 9822012345"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-3.5 h-3.5" />}
            />
          </FormField>

          <FormField label="Email Address (Optional)">
            <Input
              type="email"
              placeholder="e.g. anand@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
        </form>
      </Dialog>
    </div>
  );
}
