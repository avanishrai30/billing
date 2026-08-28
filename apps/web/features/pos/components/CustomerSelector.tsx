'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { User, UserPlus, Phone, Check, X, Search, AlertCircle, Sparkles } from 'lucide-react';
import {
  Select,
  Button,
  Dialog,
  FormField,
  Input,
  Badge
} from '../../../components/ui';
import { useCreateCustomerMutation } from '../hooks';
import { normalizeCustomerPhone, formatPhoneDisplay } from '../calculations';
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
  const [phoneInput, setPhoneInput] = useState('');
  const [inlineName, setInlineName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const createCustomerMutation = useCreateCustomerMutation();

  // Sync internal phone input if selected customer changes externally
  useEffect(() => {
    if (selectedCustomer?.phone) {
      setPhoneInput(selectedCustomer.phone);
      setInlineName(selectedCustomer.name || '');
    } else if (!selectedCustomer) {
      setPhoneInput('');
      setInlineName('');
    }
  }, [selectedCustomer]);

  const normalizedInput = useMemo(() => normalizeCustomerPhone(phoneInput), [phoneInput]);

  // Find matching customer accounts by normalized phone
  const matchingCustomers = useMemo(() => {
    if (!normalizedInput || normalizedInput.length < 3) return [];
    return customers.filter((c) => {
      const cNorm = normalizeCustomerPhone(c.phone);
      return cNorm.includes(normalizedInput);
    });
  }, [customers, normalizedInput]);

  const exactMatch = useMemo(() => {
    if (!normalizedInput || normalizedInput.length < 10) return null;
    return customers.find((c) => normalizeCustomerPhone(c.phone) === normalizedInput);
  }, [customers, normalizedInput]);

  // Handle phone input typing
  const handlePhoneChange = (val: string) => {
    setPhoneInput(val);
    const norm = normalizeCustomerPhone(val);

    if (!val.trim()) {
      onSelectCustomer(null);
      return;
    }

    // Exact 10-digit match resolution
    if (norm.length >= 10) {
      const match = customers.find((c) => normalizeCustomerPhone(c.phone) === norm);
      if (match) {
        onSelectCustomer(match);
        return;
      }
    }

    // Non-registered phone -> Create walk-in session with phone
    onSelectCustomer({
      id: 'walk-in',
      name: inlineName.trim() || 'Walk-in Customer',
      phone: val.trim()
    });
  };

  const handleInlineNameChange = (val: string) => {
    setInlineName(val);
    if (selectedCustomer) {
      onSelectCustomer({
        ...selectedCustomer,
        name: val.trim() || 'Walk-in Customer'
      });
    }
  };

  const handleClear = () => {
    setPhoneInput('');
    setInlineName('');
    onSelectCustomer(null);
  };

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
        setPhoneInput(res.customer.phone || '');
        setInlineName(res.customer.name || '');
        setIsModalOpen(false);
        setName('');
        setPhone('');
        setEmail('');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to register customer.');
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <User className="w-3.5 h-3.5 text-blue-600" />
          <span>Customer & Account (Phone-First)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-slate-600 hover:text-slate-800 text-[11px] font-medium cursor-pointer"
          >
            {showDropdown ? 'Quick Phone' : 'Browse Directory'}
          </button>
          <button
            type="button"
            onClick={() => {
              setPhone(phoneInput);
              setIsModalOpen(true);
            }}
            className="text-blue-700 hover:text-blue-800 text-[11px] font-medium flex items-center gap-1 cursor-pointer focus-ring rounded"
          >
            <UserPlus className="w-3 h-3" />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {!showDropdown ? (
        <div className="space-y-2">
          {/* Phone First Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-3.5 h-3.5" />
            </div>
            <input
              type="tel"
              data-testid="customer-phone-input"
              placeholder="Enter customer phone (e.g. 9822011223)..."
              value={phoneInput}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
            {phoneInput && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Matches dropdown if searching partial phone */}
          {matchingCustomers.length > 1 && !exactMatch && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm max-h-36 overflow-y-auto divide-y divide-slate-100 text-[11px]">
              {matchingCustomers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectCustomer(c);
                    setPhoneInput(c.phone || '');
                  }}
                  className="px-2.5 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                >
                  <span className="font-semibold text-slate-900">{c.name}</span>
                  <span className="font-mono text-slate-500">{c.phone}</span>
                </div>
              ))}
            </div>
          )}

          {/* Active Resolved Customer Badge */}
          {selectedCustomer && selectedCustomer.id !== 'walk-in' && (
            <div className="flex items-center justify-between text-[11px] bg-blue-50 rounded-lg px-2.5 py-1.5 text-blue-900 border border-blue-200">
              <div className="flex items-center gap-1.5 truncate">
                <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                <span className="font-semibold truncate">{selectedCustomer.name}</span>
                <span className="text-blue-700 font-mono">({formatPhoneDisplay(selectedCustomer.phone)})</span>
              </div>
              <Badge variant="success" size="sm">Verified Account</Badge>
            </div>
          )}

          {/* Unregistered Phone -> Inline Name Entry */}
          {selectedCustomer && selectedCustomer.id === 'walk-in' && phoneInput.trim().length >= 4 && (
            <div className="space-y-1 bg-amber-50/70 border border-amber-200/80 rounded-lg p-2 text-[11px]">
              <div className="flex items-center justify-between text-amber-900">
                <span className="font-medium">New Customer (Walk-in)</span>
                <span className="font-mono text-amber-700">{formatPhoneDisplay(phoneInput)}</span>
              </div>
              <input
                type="text"
                placeholder="Customer Name (optional)..."
                value={inlineName}
                onChange={(e) => handleInlineNameChange(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-amber-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          )}
        </div>
      ) : (
        <Select
          placeholder="Select customer from directory..."
          options={[
            { value: '', label: 'Walk-in / Guest Customer' },
            ...customers.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.phone || 'No phone'})`
            }))
          ]}
          value={selectedCustomer?.id || ''}
          onChange={(e) => {
            const val = e.target.value;
            const found = customers.find((c) => c.id === val);
            onSelectCustomer(found || null);
          }}
        />
      )}

      {/* Quick Add Customer Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Customer"
        description="Save customer contact details for loyalty points and invoice history"
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
