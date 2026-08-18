import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AuditHeader,
  AuditSummary,
  AuditTable,
  AuditDetailDrawer,
  AuditEventBadge,
  AuditPayloadViewer
} from '../../features/audit/components';
import type { AuditLogDoc } from '../../features/audit/types';

describe('Audit UI Components Suite', () => {
  const mockLog: AuditLogDoc = {
    _id: 'log-101',
    eventType: 'invoice_created',
    entity: 'billing',
    entityId: 'INV-9901',
    before: {},
    after: {
      invoiceId: 'INV-9901',
      grandTotal: 1500,
      customerName: 'Sanjay Deshmukh'
    },
    performedBy: 'ramesh.cashier',
    user: 'Ramesh Patil (@ramesh.cashier)',
    role: 'EMPLOYEE',
    action: 'billing',
    view: 'billing',
    details: "Completed POS transaction for customer 'Sanjay Deshmukh'. Created Invoice #INV-9901 (Total: ₹1500)",
    businessId: 'store-1',
    businessName: 'Mumbai Flagship',
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 Chrome/120.0',
    requestId: 'req-1723812345000',
    timestamp: '2026-08-17T03:00:00.000Z'
  };

  it('1. AuditHeader renders title, count badge, and refresh callback', () => {
    const onRefresh = jest.fn();

    render(
      <AuditHeader
        totalLoaded={42}
        isLoading={false}
        onRefresh={onRefresh}
      />
    );

    expect(screen.getByText('Security & Immutable Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('42 Events Loaded')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Refresh Ledger'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('2. AuditSummary renders KPI cards', () => {
    const metrics = {
      totalEvents: 42,
      authEvents: 10,
      billingEvents: 25,
      mutations: 6,
      securityAlerts: 1
    };

    render(<AuditSummary metrics={metrics} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('3. AuditEventBadge renders semantic labels based on event/action', () => {
    const { rerender } = render(<AuditEventBadge eventType="LOGIN_SUCCESS" action="auth" />);
    expect(screen.getByText('LOGIN SUCCESS')).toBeInTheDocument();

    rerender(<AuditEventBadge eventType="invoice_created" action="billing" />);
    expect(screen.getByText('POS SALE')).toBeInTheDocument();

    rerender(<AuditEventBadge eventType="AUTHORIZATION_DENIED" action="security" />);
    expect(screen.getByText('ACCESS DENIED')).toBeInTheDocument();

    rerender(<AuditEventBadge eventType="unknown_custom_event" />);
    expect(screen.getByText('UNKNOWN CUSTOM EVENT')).toBeInTheDocument();
  });

  it('4. AuditTable renders rows, actor, store, details, and action button', () => {
    const onView = jest.fn();

    render(
      <AuditTable
        logs={[mockLog]}
        isLoading={false}
        onViewLog={onView}
      />
    );

    expect(screen.getAllByText('POS SALE')[0]).toBeInTheDocument();
    expect(screen.getAllByText('INV-9901')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Ramesh Patil (@ramesh.cashier)')[0]).toBeInTheDocument();
    expect(screen.getAllByText('EMPLOYEE')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Mumbai Flagship')[0]).toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('Inspect audit log details for invoice_created')[0]);
    expect(onView).toHaveBeenCalledWith(mockLog);
  });

  it('5. AuditPayloadViewer safely redacts sensitive fields in snapshot and diffs', () => {
    const before = {
      status: 'active',
      password: 'mySecretPassword'
    };

    const after = {
      status: 'suspended',
      password: 'newSecretPassword',
      token: 'jwt-12345'
    };

    render(<AuditPayloadViewer before={before} after={after} title="Payload Diffs" />);

    expect(screen.getByText('Payload Diffs')).toBeInTheDocument();
    expect(screen.getByText('status:')).toBeInTheDocument();
    expect(screen.getByText('"active"')).toBeInTheDocument();
    expect(screen.getByText('"suspended"')).toBeInTheDocument();
  });

  it('6. AuditDetailDrawer renders drawer attribution and close callback', () => {
    const onClose = jest.fn();

    render(
      <AuditDetailDrawer
        isOpen={true}
        onClose={onClose}
        log={mockLog}
      />
    );

    expect(screen.getByText('Audit Event Details')).toBeInTheDocument();
    expect(screen.getByText('Request ID: req-1723812345000')).toBeInTheDocument();
    expect(screen.getByText('Actor & Security Attribution')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close Inspection'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
