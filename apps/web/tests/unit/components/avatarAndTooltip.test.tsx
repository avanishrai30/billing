import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar, Tooltip } from '../../../components/ui';

describe('UI Primitives: Avatar & Tooltip', () => {
  it('1. Renders Avatar with initials fallback and status dot', () => {
    render(<Avatar name="Avanish Rai" size="md" status="online" />);
    expect(screen.getByText('AR')).toBeInTheDocument();
  });

  it('2. Renders Avatar with single name initials', () => {
    render(<Avatar name="Admin" size="sm" />);
    expect(screen.getByText('AD')).toBeInTheDocument();
  });

  it('3. Renders Avatar with image and falls back to initials on error', () => {
    const { rerender } = render(<Avatar name="Rajesh Sharma" src="https://example.com/broken-avatar.png" size="2xl" />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();

    fireEvent.error(img);
    expect(screen.getByText('RS')).toBeInTheDocument();

    rerender(<Avatar name="Rajesh Sharma" src="https://example.com/new-avatar.png" size="2xl" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('4. Renders Tooltip on hover/focus', () => {
    render(
      <Tooltip content="Quick stock inspect">
        <button type="button">Inspect Stock</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: /inspect stock/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.mouseEnter(trigger.parentElement!);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Quick stock inspect');

    fireEvent.mouseLeave(trigger.parentElement!);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
