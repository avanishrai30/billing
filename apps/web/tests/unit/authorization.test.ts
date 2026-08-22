import { renderHook } from '@testing-library/react';
import { useAuthorization } from '../../hooks/useAuthorization';
import { useAuth } from '../../hooks/useAuth';

jest.mock('../../hooks/useAuth');

describe('Shared authorization hook', () => {
  it('derives can, canAny, and canAll from effective permissions', () => {
    const permissions = ['dashboard.view', 'inventory.view', 'inventory.adjust'];

    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id: 'usr-1',
        username: 'operator',
        permissions
      },
      hasPermission: (permission: string) => permissions.includes(permission),
      isAuthenticated: true
    });

    const { result } = renderHook(() => useAuthorization());

    expect(result.current.can('inventory.adjust')).toBe(true);
    expect(result.current.can('inventory.transfer')).toBe(false);
    expect(result.current.canAny(['inventory.transfer', 'inventory.adjust'])).toBe(true);
    expect(result.current.canAny(['users.view', 'settings.view'])).toBe(false);
    expect(result.current.canAll(['dashboard.view', 'inventory.view'])).toBe(true);
    expect(result.current.canAll(['dashboard.view', 'users.view'])).toBe(false);
  });
});
