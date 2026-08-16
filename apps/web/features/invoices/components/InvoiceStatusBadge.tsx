'use client';

import React from 'react';
import { Badge } from '../../../components/ui';
import { getInvoiceStatusConfig } from '../calculations';

export interface InvoiceStatusBadgeProps {
  status?: string;
  isArchived?: boolean;
}

export function InvoiceStatusBadge({ status, isArchived }: InvoiceStatusBadgeProps) {
  if (isArchived || status === 'VOIDED') {
    return (
      <Badge variant="danger" size="sm" dot>
        Voided
      </Badge>
    );
  }

  const config = getInvoiceStatusConfig(status);
  return (
    <Badge variant={config.variant} size="sm" dot>
      {config.label}
    </Badge>
  );
}
