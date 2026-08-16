'use client';

import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Input,
  PasswordInput,
  Textarea,
  Select,
  Checkbox,
  Radio,
  Switch,
  FormField,
  Card,
  Panel,
  Section,
  Stack,
  Divider,
  Badge,
  StatusBadge,
  Tag,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  EmptyState,
  Skeleton,
  Pagination,
  Dialog,
  Drawer,
  Dropdown,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  PageHeader,
  SectionHeader,
  Toolbar,
  FilterBar,
  StatCard,
  MetricCard,
  LoadingState,
  ErrorState,
  useToast
} from '../../../components/ui';
import {
  Plus,
  Trash2,
  Edit,
  Download,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Boxes,
  Users,
  Settings
} from 'lucide-react';

export default function DesignSystemGalleryPage() {
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');

  // Form sample state
  const [textVal, setTextVal] = useState('');
  const [selectVal, setSelectVal] = useState('');
  const [checked, setChecked] = useState(true);
  const [radioVal, setRadioVal] = useState('opt1');
  const [switchVal, setSwitchVal] = useState(true);

  return (
    <div className="space-y-10 pb-16">
      {/* 1. Page Header & Toolbar */}
      <PageHeader
        title="Design System & UI Primitives Gallery"
        description="Authoritative reference catalog of Apple-inspired editorial enterprise UI components."
        badge={<Badge variant="brand" dot>Phase 3 Verified</Badge>}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => toast.info('Export initiated', 'Preparing component specs')}
            >
              Export Tokens
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setDialogOpen(true)}
            >
              Open Dialog
            </Button>
          </>
        }
      />

      {/* 2. Stat Cards & Metrics */}
      <Section title="Enterprise Metric & Stat Cards" description="Tabular numbers and financial trend indicators.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Gross Daily Revenue"
            value={142580}
            isCurrency
            trend={{ value: '+14.2%', direction: 'up' }}
            subtext="vs yesterday"
            icon={<DollarSign className="w-4 h-4" />}
          />
          <StatCard
            label="Transactions Committed"
            value="1,248"
            trend={{ value: '+5.4%', direction: 'up' }}
            subtext="today"
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <StatCard
            label="Active Inventory Value"
            value={894200}
            isCurrency
            trend={{ value: '-2.1%', direction: 'down' }}
            subtext="3,420 items"
            icon={<Boxes className="w-4 h-4" />}
          />
          <StatCard
            label="Active Cashiers"
            value="18 / 20"
            subtext="Across 4 stores"
            icon={<Users className="w-4 h-4" />}
          />
        </div>
      </Section>

      {/* 3. Button System */}
      <Section title="Button System" description="Rigid geometry, paint-only transitions, and accessible states.">
        <Card variant="default">
          <div className="space-y-6">
            <div>
              <span className="text-xs text-slate-400 font-mono block mb-3">Variants</span>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="ghost">Ghost Action</Button>
                <Button variant="outline">Outline Action</Button>
                <Button variant="success">Success Action</Button>
                <Button variant="danger">Danger Action</Button>
              </div>
            </div>

            <Divider />

            <div>
              <span className="text-xs text-slate-400 font-mono block mb-3">Sizes & States</span>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small (sm)</Button>
                <Button size="md">Medium (md)</Button>
                <Button size="lg">Large (lg)</Button>
                <Button isLoading>Processing</Button>
                <Button disabled>Disabled Button</Button>
                <IconButton
                  aria-label="Edit item"
                  variant="secondary"
                  icon={<Edit className="w-4 h-4" />}
                  onClick={() => toast.success('Action triggered', 'Edit clicked')}
                />
                <IconButton
                  aria-label="Delete item"
                  variant="danger"
                  icon={<Trash2 className="w-4 h-4" />}
                />
              </div>
            </div>
          </div>
        </Card>
      </Section>

      {/* 4. Form Controls */}
      <Section title="Form Controls & Inputs" description="Accessible inputs with error states and validation alerts.">
        <Panel title="Form Field Catalog" subtitle="Integrated with Label, Helper Text, and FieldError.">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField label="Standard Input" htmlFor="std-input" helperText="Standard textual input.">
              <Input
                id="std-input"
                placeholder="Enter outlet name"
                value={textVal}
                onChange={(e) => setTextVal(e.target.value)}
              />
            </FormField>

            <FormField label="Input with Icon" htmlFor="icon-input">
              <Input
                id="icon-input"
                placeholder="Search products..."
                leftIcon={<Search className="w-4 h-4" />}
              />
            </FormField>

            <FormField
              label="Numeric Input"
              htmlFor="num-input"
              helperText="Formatted with tabular numerals."
            >
              <Input
                id="num-input"
                isNumeric
                placeholder="0.00"
                defaultValue="4,500.00"
              />
            </FormField>

            <FormField label="Password Input" htmlFor="pwd-input">
              <PasswordInput id="pwd-input" placeholder="Enter secure passphrase" />
            </FormField>

            <FormField label="Select Outlet" htmlFor="select-input">
              <Select
                id="select-input"
                placeholder="Select store location"
                value={selectVal}
                onChange={(e) => setSelectVal(e.target.value)}
                options={[
                  { value: 'all', label: 'All Stores (Enterprise)' },
                  { value: 'store-1', label: 'VC Flagship Bandra' },
                  { value: 'store-2', label: 'VC Outlet Andheri' }
                ]}
              />
            </FormField>

            <FormField
              label="Input with Error"
              htmlFor="err-input"
              error="A valid GSTIN formatted code is required"
            >
              <Input id="err-input" hasError defaultValue="INVALID123" />
            </FormField>

            <div className="md:col-span-2 lg:col-span-3 space-y-4 pt-2">
              <FormField label="Textarea Comments" htmlFor="txt-comments">
                <Textarea id="txt-comments" placeholder="Add optional transaction notes..." />
              </FormField>

              <div className="flex flex-wrap items-center gap-8 pt-2">
                <Checkbox
                  label="Enable Automatic Batch Sync"
                  helperText="Updates local inventory in realtime"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />

                <div className="flex items-center gap-4">
                  <Radio
                    name="sample-radio"
                    label="Retail Mode"
                    checked={radioVal === 'opt1'}
                    onChange={() => setRadioVal('opt1')}
                  />
                  <Radio
                    name="sample-radio"
                    label="Wholesale Mode"
                    checked={radioVal === 'opt2'}
                    onChange={() => setRadioVal('opt2')}
                  />
                </div>

                <Switch
                  label="Dark Mode Strict Freeze"
                  checked={switchVal}
                  onChange={(e) => setSwitchVal(e.target.checked)}
                />
              </div>
            </div>
          </div>
        </Panel>
      </Section>

      {/* 5. Badges, Tags, and Statuses */}
      <Section title="Badges, Status Indicators & Tags" description="Semantic status tokens and dismissible tags.">
        <Card variant="default">
          <div className="space-y-4">
            <div>
              <span className="text-xs text-slate-400 font-mono block mb-2">Semantic Badges</span>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">Neutral</Badge>
                <Badge variant="brand" dot>Brand Active</Badge>
                <Badge variant="success" dot>Success</Badge>
                <Badge variant="warning" dot>Warning</Badge>
                <Badge variant="danger" dot>Critical Alert</Badge>
                <Badge variant="info" dot>Information</Badge>
              </div>
            </div>

            <Divider />

            <div>
              <span className="text-xs text-slate-400 font-mono block mb-2">Domain Status Badges</span>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status="paid" />
                <StatusBadge status="partially_paid" />
                <StatusBadge status="unpaid" />
                <StatusBadge status="voided" />
                <StatusBadge status="completed" />
                <StatusBadge status="in_transit" />
                <StatusBadge status="active" />
                <StatusBadge status="suspended" />
              </div>
            </div>

            <Divider />

            <div>
              <span className="text-xs text-slate-400 font-mono block mb-2">Tags</span>
              <div className="flex flex-wrap items-center gap-2">
                <Tag onRemove={() => toast.info('Tag removed', 'Tag dismissed')}>Category: Dairy</Tag>
                <Tag onRemove={() => toast.info('Tag removed', 'Tag dismissed')}>Location: Bandra</Tag>
                <Tag>SKU: A-102</Tag>
              </div>
            </div>
          </div>
        </Card>
      </Section>

      {/* 6. Tabs & Content Panels */}
      <Section title="Tabs Navigation" description="Accessible tab list with animated paint-only active pill.">
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Card variant="subtle">
              <h4 className="text-sm font-semibold text-white mb-1">Overview Panel</h4>
              <p className="text-xs text-slate-300">
                Declarative tab content rendered cleanly without layout shift.
              </p>
            </Card>
          </TabsContent>
          <TabsContent value="history">
            <Card variant="subtle">
              <h4 className="text-sm font-semibold text-white mb-1">History Panel</h4>
              <p className="text-xs text-slate-300">Historical records ledger.</p>
            </Card>
          </TabsContent>
          <TabsContent value="audit">
            <Card variant="subtle">
              <h4 className="text-sm font-semibold text-white mb-1">Audit Trail</h4>
              <p className="text-xs text-slate-300">Security and session logs.</p>
            </Card>
          </TabsContent>
          <TabsContent value="settings">
            <Card variant="subtle">
              <h4 className="text-sm font-semibold text-white mb-1">Configuration Settings</h4>
              <p className="text-xs text-slate-300">Module specific configurations.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </Section>

      {/* 7. Enterprise Table & Pagination */}
      <Section title="Enterprise Table System" description="Dense, comfortable, tabular nums, and pagination controls.">
        <Toolbar
          left={
            <div className="w-64">
              <Input
                placeholder="Filter table rows..."
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
          }
          right={
            <>
              <Dropdown
                trigger={
                  <Button variant="secondary" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
                    Filter By
                  </Button>
                }
                items={[
                  { label: 'All Statuses', onClick: () => {} },
                  { label: 'Paid Only', onClick: () => {} },
                  { label: 'Unpaid Only', onClick: () => {} }
                ]}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDrawerOpen(true)}
              >
                Open Side Drawer
              </Button>
            </>
          }
        />

        <Table density="comfortable">
          <TableHeader>
            <tr>
              <TableHead>SKU / Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead isNumeric>Stock Balance</TableHead>
              <TableHead isNumeric>Unit Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead align="right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            <TableRow isInteractive>
              <TableCell className="font-semibold text-white">Organic Cow Ghee 500ml</TableCell>
              <TableCell><Badge variant="neutral">Dairy</Badge></TableCell>
              <TableCell isNumeric>124 units</TableCell>
              <TableCell isNumeric>₹ 650.00</TableCell>
              <TableCell><StatusBadge status="active" /></TableCell>
              <TableCell align="right">
                <Button variant="ghost" size="sm">Inspect</Button>
              </TableCell>
            </TableRow>
            <TableRow isInteractive>
              <TableCell className="font-semibold text-white">Farm Fresh Paneer 1kg</TableCell>
              <TableCell><Badge variant="neutral">Loose Dairy</Badge></TableCell>
              <TableCell isNumeric>42.5 kg</TableCell>
              <TableCell isNumeric>₹ 420.00</TableCell>
              <TableCell><StatusBadge status="active" /></TableCell>
              <TableCell align="right">
                <Button variant="ghost" size="sm">Inspect</Button>
              </TableCell>
            </TableRow>
            <TableRow isInteractive>
              <TableCell className="font-semibold text-white">A2 Curd Pot 400g</TableCell>
              <TableCell><Badge variant="neutral">Packaged</Badge></TableCell>
              <TableCell isNumeric>0 units</TableCell>
              <TableCell isNumeric>₹ 85.00</TableCell>
              <TableCell><StatusBadge status="voided" /></TableCell>
              <TableCell align="right">
                <Button variant="ghost" size="sm">Inspect</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div className="mt-3">
          <Pagination
            currentPage={currentPage}
            totalPages={12}
            totalItems={118}
            pageSize={10}
            onPageChange={setCurrentPage}
          />
        </div>
      </Section>

      {/* 8. Empty & Feedback States */}
      <Section title="Feedback & Error States" description="Deterministic loading, error, and empty states.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EmptyState
            title="No Invoices Found"
            description="There are no active invoices matching your current filter criteria."
            actionLabel="Create Invoice"
            onAction={() => toast.success('Action triggered', 'New Invoice flow')}
          />
          <ErrorState
            title="Service Gateway Unavailable"
            message="Could not establish connection to the store sync replica."
            onRetry={() => toast.info('Retrying connection...', 'Sent handshake')}
          />
        </div>
      </Section>

      {/* Dialog Modal Demo */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Enterprise Confirmation Dialog"
        description="Verify this critical operational action."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setDialogOpen(false);
                toast.success('Confirmed', 'Operational action executed');
              }}
            >
              Confirm Action
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-300 leading-relaxed">
          Dialog component conforms to accessible modal standards with Escape key handling, backdrop click closure, and body scroll lock.
        </p>
      </Dialog>

      {/* Drawer Demo */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Product Inspection Drawer"
        description="Detailed stock metadata and transaction ledger."
        footer={
          <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(false)}>
            Close Drawer
          </Button>
        }
      >
        <div className="space-y-4">
          <MetricCard
            title="Current Stock On Hand"
            metric="124 Units"
            status="success"
            description="Warehouse location: Bay 4-B"
          />
          <p className="text-xs text-slate-300 leading-relaxed">
            Drawers provide dense slide-out context panels for ERP auditing without navigating away from the current view.
          </p>
        </div>
      </Drawer>
    </div>
  );
}
