'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Ban, AlertCircle } from 'lucide-react';
import {
  Dialog,
  Button,
  FormField,
  Input
} from '../../../components/ui';
import { voidInvoiceSchema, type VoidInvoiceFormValues } from '../schemas';
import { useVoidInvoiceMutation } from '../hooks';
import { formatInvoiceNumber } from '../calculations';
import type { Invoice } from '../types';

export interface InvoiceVoidDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export function InvoiceVoidDialog({
  isOpen,
  onClose,
  invoice
}: InvoiceVoidDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const voidMutation = useVoidInvoiceMutation();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<VoidInvoiceFormValues>({
    resolver: zodResolver(voidInvoiceSchema as any),
    defaultValues: {
      invoiceId: '',
      reason: ''
    }
  });

  useEffect(() => {
    if (isOpen && invoice) {
      setServerError(null);
      const invId = invoice.id || invoice.invoiceNumber || '';
      reset({
        invoiceId: invId,
        reason: ''
      });
      setValue('invoiceId', invId);
    }
  }, [isOpen, invoice, reset, setValue]);

  if (!invoice) return null;
  const invoiceNo = formatInvoiceNumber(invoice);
  const grandTotal = Number(invoice.grandTotal ?? invoice.grandtotal ?? 0);

  const onSubmit = async (values: VoidInvoiceFormValues) => {
    setServerError(null);
    try {
      await voidMutation.mutateAsync({
        id: invoice.id || invoice.invoiceNumber,
        reason: values.reason
      });
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to void invoice.');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Void Invoice #${invoiceNo}`}
      description="This action is irreversible. Inventory batches will be reverted automatically."
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={voidMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            isLoading={voidMutation.isPending}
            onClick={handleSubmit(onSubmit)}
            leftIcon={<Ban className="w-3.5 h-3.5" />}
          >
            Confirm & Void Invoice
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
        <input type="hidden" {...register('invoiceId')} />

        {serverError && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Warning Alert Banner */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-sm text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Automatic Inventory Reversal Warning</span>
          </div>
          <p className="text-amber-200/90 leading-relaxed">
            Voiding invoice <strong className="font-mono text-white">#{invoiceNo}</strong> (₹{grandTotal.toFixed(2)}) will automatically restore all {invoice.items?.length || 0} line item units back into active inventory at store <strong className="font-mono text-white">'{invoice.locationId || invoice.storeId}'</strong>.
          </p>
        </div>

        {/* Audit Reason Input */}
        <FormField
          label="Void Audit Reason Note"
          required
          error={errors.reason?.message}
          helperText="Explain why this invoice is being voided for compliance auditing"
        >
          <Input
            placeholder="e.g. Customer return / Billing correction"
            {...register('reason')}
            autoFocus
          />
        </FormField>
      </form>
    </Dialog>
  );
}
