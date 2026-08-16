import {
  isSensitiveKey,
  redactSensitivePayload,
  calculatePayloadDiff,
  calculateAuditSummary
} from '../../features/audit/calculations';
import type { AuditLogDoc } from '../../features/audit/types';

describe('Audit Payload Viewer & Defense-in-Depth Redaction Suite', () => {
  it('1. isSensitiveKey detects all variants of secret keys', () => {
    expect(isSensitiveKey('password')).toBe(true);
    expect(isSensitiveKey('passwordHash')).toBe(true);
    expect(isSensitiveKey('token')).toBe(true);
    expect(isSensitiveKey('secret')).toBe(true);
    expect(isSensitiveKey('currentPassword')).toBe(true);
    expect(isSensitiveKey('newPassword')).toBe(true);
    expect(isSensitiveKey('jwt')).toBe(true);
    expect(isSensitiveKey('authorization')).toBe(true);
    expect(isSensitiveKey('username')).toBe(false);
    expect(isSensitiveKey('email')).toBe(false);
  });

  it('2. redactSensitivePayload recursively redacts sensitive fields from nested structures', () => {
    const rawPayload = {
      username: 'admin',
      password: 'superSecretPassword123',
      nested: {
        token: 'eyJhGciOiJIUzI1Ni...',
        secretKey: 'my-private-key',
        allowedAction: 'view'
      },
      arrayField: [
        { currentPassword: 'oldPass', publicName: 'Account' }
      ]
    };

    const sanitized = redactSensitivePayload(rawPayload);

    expect(sanitized.username).toBe('admin');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.nested.token).toBe('[REDACTED]');
    expect(sanitized.nested.secretKey).toBe('[REDACTED]');
    expect(sanitized.nested.allowedAction).toBe('view');
    expect(sanitized.arrayField[0].currentPassword).toBe('[REDACTED]');
    expect(sanitized.arrayField[0].publicName).toBe('Account');
  });

  it('3. calculatePayloadDiff computes field differences and marks changes', () => {
    const before = {
      status: 'active',
      role: 'Cashier',
      password: 'secretBefore'
    };

    const after = {
      status: 'suspended',
      role: 'Cashier',
      password: 'secretAfter',
      reason: 'Violated terms'
    };

    const diffs = calculatePayloadDiff(before, after);

    const statusDiff = diffs.find((d) => d.key === 'status');
    expect(statusDiff?.isChanged).toBe(true);
    expect(statusDiff?.before).toBe('active');
    expect(statusDiff?.after).toBe('suspended');

    const reasonDiff = diffs.find((d) => d.key === 'reason');
    expect(reasonDiff?.isAdded).toBe(true);
    expect(reasonDiff?.after).toBe('Violated terms');

    // Sensitive field before/after is sanitized
    const passwordDiff = diffs.find((d) => d.key === 'password');
    // Since both before and after are redacted to '[REDACTED]', they won't trigger isChanged
    expect(passwordDiff?.before).toBeUndefined();
  });

  it('4. calculateAuditSummary aggregates event categories correctly', () => {
    const mockLogs: AuditLogDoc[] = [
      {
        eventType: 'LOGIN_SUCCESS',
        entity: 'auth',
        entityId: 'usr-1',
        performedBy: 'admin',
        user: 'Admin',
        role: 'SUPER ADMIN',
        action: 'auth',
        view: 'login',
        details: 'Auth success',
        businessId: 'all',
        businessName: 'All Outlets',
        ip: '127.0.0.1',
        userAgent: 'test',
        requestId: 'req-1',
        timestamp: new Date().toISOString()
      },
      {
        eventType: 'invoice_created',
        entity: 'billing',
        entityId: 'INV-1',
        performedBy: 'cashier',
        user: 'Cashier',
        role: 'EMPLOYEE',
        action: 'billing',
        view: 'billing',
        details: 'Invoice created',
        businessId: 'store-1',
        businessName: 'Store 1',
        ip: '127.0.0.1',
        userAgent: 'test',
        requestId: 'req-2',
        timestamp: new Date().toISOString()
      },
      {
        eventType: 'AUTHORIZATION_DENIED',
        entity: 'auth',
        entityId: 'usr-2',
        performedBy: 'cashier',
        user: 'Cashier',
        role: 'EMPLOYEE',
        action: 'security',
        view: 'security',
        details: 'Access denied',
        businessId: 'store-1',
        businessName: 'Store 1',
        ip: '127.0.0.1',
        userAgent: 'test',
        requestId: 'req-3',
        timestamp: new Date().toISOString()
      }
    ];

    const summary = calculateAuditSummary(mockLogs);
    expect(summary.totalEvents).toBe(3);
    expect(summary.authEvents).toBe(1);
    expect(summary.billingEvents).toBe(1);
    expect(summary.securityAlerts).toBe(1);
    expect(summary.mutations).toBe(0);
  });
});
