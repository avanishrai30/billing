import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  PageHeader,
  SectionHeader,
  StatCard,
  MetricCard
} from '../../../components/ui';

describe('UI Primitives: Tabs, Headers & Metric Cards', () => {
  it('1. Tabs switches visible content panel on trigger click', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Panel One Content</TabsContent>
        <TabsContent value="tab2">Panel Two Content</TabsContent>
      </Tabs>
    );

    expect(screen.getByText('Panel One Content')).toBeInTheDocument();
    expect(screen.queryByText('Panel Two Content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));

    expect(screen.queryByText('Panel One Content')).not.toBeInTheDocument();
    expect(screen.getByText('Panel Two Content')).toBeInTheDocument();
  });

  it('2. PageHeader and SectionHeader render titles and action slots', () => {
    render(
      <div>
        <PageHeader
          title="Product Master"
          description="Manage SKUs"
          actions={<button>Add SKU</button>}
        />
        <SectionHeader title="Category Breakdown" />
      </div>
    );

    expect(screen.getByRole('heading', { name: 'Product Master' })).toBeInTheDocument();
    expect(screen.getByText('Manage SKUs')).toBeInTheDocument();
    expect(screen.getByText('Add SKU')).toBeInTheDocument();
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
  });

  it('3. StatCard and MetricCard render values with tabular numbers and trends', () => {
    render(
      <div>
        <StatCard
          label="Today Sales"
          value="₹ 54,200"
          trend={{ value: '+12%', direction: 'up' }}
        />
        <MetricCard title="System Health" metric="99.9%" status="success" />
      </div>
    );

    expect(screen.getByText(/today sales/i)).toBeInTheDocument();
    expect(screen.getByText('₹ 54,200')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();
    expect(screen.getByText(/system health/i)).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument();
  });
});
