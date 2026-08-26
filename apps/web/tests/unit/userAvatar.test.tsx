import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserAvatar, getUserInitials } from '../../components/ui/UserAvatar';

describe('UserAvatar Component & Business Initials Suite', () => {
  describe('Initials Generation Rules', () => {
    it('1. Generates single initial for single-word names', () => {
      expect(getUserInitials('Rajesh')).toBe('R');
      expect(getUserInitials('Avanish')).toBe('A');
    });

    it('2. Generates two initials for two-word names', () => {
      expect(getUserInitials('Pradeep H')).toBe('PH');
      expect(getUserInitials('Ramesh Patil')).toBe('RP');
    });

    it('3. Generates first and last initial for 3+ word names', () => {
      expect(getUserInitials('VC Organic Owner')).toBe('VO');
      expect(getUserInitials('Dr. Rajesh Kumar Sharma')).toBe('DS');
    });

    it('4. Falls back to username or U when name is empty', () => {
      expect(getUserInitials('', 'admin')).toBe('A');
      expect(getUserInitials(undefined, undefined)).toBe('U');
      expect(getUserInitials('   ', '')).toBe('U');
    });
  });

  describe('UserAvatar Rendering & Fallback Behavior', () => {
    it('5. Renders initials when user has no avatar', () => {
      const user = {
        id: 'usr-1',
        name: 'Pradeep H',
        username: 'pradeep',
        avatar: null
      };

      render(<UserAvatar user={user} size="md" />);

      expect(screen.getByText('PH')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('6. Renders img tag with resolved URL when avatar is present', () => {
      const user = {
        id: 'usr-2',
        name: 'Rajesh',
        username: 'rajesh',
        avatar: '/uploads/users/rajesh-123.webp',
        avatarUpdatedAt: '2026-08-26T00:00:00Z'
      };

      render(<UserAvatar user={user} size="sm" />);

      const img = screen.getByRole('img', { name: 'Rajesh' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', expect.stringContaining('/uploads/users/rajesh-123.webp?v='));
    });

    it('7. Falls back to initials when avatar image triggers onError', () => {
      const user = {
        id: 'usr-3',
        name: 'VC Organic Owner',
        username: 'owner',
        avatar: '/uploads/users/broken-link.webp'
      };

      render(<UserAvatar user={user} size="lg" />);

      const img = screen.getByRole('img', { name: 'VC Organic Owner' });
      expect(img).toBeInTheDocument();

      // Simulate image load error
      fireEvent.error(img);

      // Broken image should be replaced with initials fallback
      expect(screen.getByText('VO')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('8. Renders online status badge when status is specified', () => {
      const user = {
        id: 'usr-4',
        name: 'Active Staff',
        username: 'staff'
      };

      render(<UserAvatar user={user} status="online" />);

      expect(screen.getByLabelText('Status: online')).toBeInTheDocument();
      expect(screen.getByText('AS')).toBeInTheDocument();
    });
  });
});
