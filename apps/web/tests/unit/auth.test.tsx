import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../providers/AuthProvider';
import { sessionManager } from '../../lib/auth/session';
import { apiClient } from '../../lib/api/client';
import type { AuthUser } from '../../types/auth';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn()
  }),
  usePathname: () => '/'
}));

const mockUser: AuthUser = {
  id: 'usr-1',
  name: 'Super Admin',
  username: 'admin',
  role: 'SUPER ADMIN',
  category: 'super admin',
  assignedStoreId: 'all',
  status: 'active'
};

function TestAuthConsumer() {
  const { user, isAuthenticated, isLoading, hasPermission, isStoreAuthorized } = useAuth();

  if (isLoading) return <div>Loading Auth...</div>;

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'LOGGED_IN' : 'ANONYMOUS'}</div>
      <div data-testid="username">{user?.username || 'none'}</div>
      <div data-testid="can-view-audit">{hasPermission('audit.view') ? 'YES' : 'NO'}</div>
      <div data-testid="store-auth">{isStoreAuthorized('st-1') ? 'AUTHORIZED' : 'DENIED'}</div>
    </div>
  );
}

describe('Auth Foundation & Session Management', () => {
  beforeEach(() => {
    sessionManager.clearSession();
    jest.clearAllMocks();
  });

  it('1. Initializes in anonymous state when no session is in storage', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('ANONYMOUS');
      expect(screen.getByTestId('username').textContent).toBe('none');
    });
  });

  it('2. Restores session automatically when token and user are in storage', async () => {
    sessionManager.setToken('jwt-test-token');
    sessionManager.setUser(mockUser);

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('LOGGED_IN');
      expect(screen.getByTestId('username').textContent).toBe('admin');
      expect(screen.getByTestId('can-view-audit').textContent).toBe('YES');
      expect(screen.getByTestId('store-auth').textContent).toBe('AUTHORIZED');
    });
  });

  it('3. Successfully logs in and stores credentials in session', async () => {
    jest.spyOn(apiClient, 'post').mockResolvedValue({
      success: true,
      token: 'new-jwt-token',
      user: mockUser
    });

    let authContextRef: any = null;
    function TestLoginTrigger() {
      const auth = useAuth();
      authContextRef = auth;
      return <button onClick={() => auth.login({ username: 'admin', password: 'password' })}>Login</button>;
    }

    render(
      <AuthProvider>
        <TestLoginTrigger />
      </AuthProvider>
    );

    await act(async () => {
      await authContextRef.login({ username: 'admin', password: 'password' });
    });

    expect(sessionManager.getToken()).toBe('new-jwt-token');
    expect(sessionManager.getUser()?.username).toBe('admin');
  });
});
