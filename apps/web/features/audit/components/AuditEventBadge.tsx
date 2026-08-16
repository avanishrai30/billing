'use client';

import React from 'react';
import { Badge } from '../../../components/ui';
import type { AuditAction } from '../types';

export interface AuditEventBadgeProps {
  eventType: string;
  action?: AuditAction;
  size?: 'sm' | 'md';
}

export function AuditEventBadge({ eventType, action, size = 'sm' }: AuditEventBadgeProps) {
  const normEvent = (eventType || '').toLowerCase();

  let variant: 'success' | 'danger' | 'warning' | 'info' | 'brand' | 'neutral' = 'neutral';
  let label = eventType;

  if (normEvent.includes('failed') || normEvent.includes('denied') || normEvent.includes('voided') || normEvent.includes('deleted') || normEvent.includes('deactivated') || normEvent.includes('archived')) {
    variant = 'danger';
  } else if (normEvent.includes('success') || normEvent.includes('created') || action === 'billing' || action === 'create') {
    variant = 'success';
  } else if (normEvent.includes('updated') || action === 'update') {
    variant = 'warning';
  } else if (normEvent.includes('transfer') || action === 'transfer') {
    variant = 'brand';
  } else if (action === 'auth') {
    variant = 'info';
  } else if (action === 'security') {
    variant = 'danger';
  }

  // Format label for display
  if (eventType === 'LOGIN_SUCCESS') label = 'LOGIN SUCCESS';
  else if (eventType === 'LOGIN_FAILED') label = 'LOGIN FAILED';
  else if (eventType === 'AUTHORIZATION_DENIED') label = 'ACCESS DENIED';
  else if (eventType === 'invoice_created') label = 'POS SALE';
  else if (eventType === 'invoice_voided') label = 'INVOICE VOIDED';
  else if (eventType === 'inventory_transfer') label = 'STOCK TRANSFER';
  else if (eventType === 'inventory_updated') label = 'STOCK ADJUST';
  else if (eventType === 'purchase_created') label = 'PURCHASE ENTRY';
  else if (eventType === 'rbac_updated') label = 'RBAC UPDATE';
  else if (eventType === 'user_deactivated') label = 'USER SUSPENDED';
  else {
    label = eventType.replace(/_/g, ' ').toUpperCase();
  }

  return (
    <Badge variant={variant} size={size}>
      {label}
    </Badge>
  );
}
