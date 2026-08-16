import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Card,
  Panel,
  Section,
  Badge,
  StatusBadge,
  Tag
} from '../../../components/ui';

describe('UI Primitives: Cards, Badges, and Status Indicators', () => {
  it('1. Renders Card and Panel with titles and actions', () => {
    render(
      <div>
        <Card variant="elevated">Card Content</Card>
        <Panel title="Panel Title" subtitle="Panel Subtitle" action={<button>Action</button>}>
          Panel Content
        </Panel>
        <Section title="Section Title">Section Content</Section>
      </div>
    );

    expect(screen.getByText('Card Content')).toBeInTheDocument();
    expect(screen.getByText('Panel Title')).toBeInTheDocument();
    expect(screen.getByText('Panel Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Section Title')).toBeInTheDocument();
  });

  it('2. StatusBadge maps domain statuses to semantic color tokens', () => {
    const { rerender } = render(<StatusBadge status="paid" />);
    expect(screen.getByText('paid')).toBeInTheDocument();

    rerender(<StatusBadge status="partially_paid" />);
    expect(screen.getByText('partially paid')).toBeInTheDocument();

    rerender(<StatusBadge status="voided" />);
    expect(screen.getByText('voided')).toBeInTheDocument();
  });

  it('3. Tag renders and triggers onRemove callback', () => {
    const handleRemove = jest.fn();
    render(<Tag onRemove={handleRemove}>Category: Dairy</Tag>);

    expect(screen.getByText('Category: Dairy')).toBeInTheDocument();
    const removeBtn = screen.getByLabelText('Remove tag');
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });
});
