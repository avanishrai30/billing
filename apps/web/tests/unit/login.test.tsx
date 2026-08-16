import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../../app/login/page';
import { AppProviders } from '../../providers/AppProviders';
import { apiClient } from '../../lib/api/client';
import { sessionManager } from '../../lib/auth/session';
import { ApiError } from '../../lib/errors/types';

// Mock Next.js router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace
  }),
  usePathname: () => '/login'
}));

describe('Phase 2 Login Component & Error Handling', () => {
  beforeEach(() => {
    sessionManager.clearSession();
    jest.clearAllMocks();
  });

  it('1. Renders complete login form with username, password, and sign in button', () => {
    render(
      <AppProviders>
        <LoginPage />
      </AppProviders>
    );

    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('2. Toggles password visibility without modifying input layout geometry', () => {
    render(
      <AppProviders>
        <LoginPage />
      </AppProviders>
    );

    const passwordInput = screen.getByPlaceholderText(/enter your password/i) as HTMLInputElement;
    const toggleButton = screen.getByLabelText(/show password/i);

    expect(passwordInput.type).toBe('password');
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('text');
    expect(screen.getByLabelText(/hide password/i)).toBeInTheDocument();
  });

  it('3. Displays validation error when submitted with empty fields', async () => {
    render(
      <AppProviders>
        <LoginPage />
      </AppProviders>
    );

    const form = screen.getByPlaceholderText(/enter your username/i).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/please enter both your username and password/i);
    });
  });

  it('4. Handles INVALID_CREDENTIALS ApiError and displays human-readable error', async () => {
    jest.spyOn(apiClient, 'post').mockRejectedValue(
      new ApiError({
        message: 'Invalid username or password',
        status: 401,
        code: 'INVALID_CREDENTIALS'
      })
    );

    render(
      <AppProviders>
        <LoginPage />
      </AppProviders>
    );

    fireEvent.change(screen.getByPlaceholderText(/enter your username/i), { target: { value: 'wronguser' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'wrongpass' } });
    const form = screen.getByPlaceholderText(/enter your username/i).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid username or password/i);
    });
  });

  it('5. Handles ACCOUNT_SUSPENDED ApiError and displays administrative notice', async () => {
    jest.spyOn(apiClient, 'post').mockRejectedValue(
      new ApiError({
        message: 'Account is suspended',
        status: 403,
        code: 'ACCOUNT_SUSPENDED'
      })
    );

    render(
      <AppProviders>
        <LoginPage />
      </AppProviders>
    );

    fireEvent.change(screen.getByPlaceholderText(/enter your username/i), { target: { value: 'suspendeduser' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'password123' } });
    const form = screen.getByPlaceholderText(/enter your username/i).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/account has been suspended/i);
    });
  });
});
