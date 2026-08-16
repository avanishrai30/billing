'use client';

import React, { useState } from 'react';
import { PlusCircle, History } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import {
  useCreatePurchaseMutation,
  useVoidPurchaseMutation,
  usePurchaseLookups
} from '../../../features/purchases/hooks';
import {
  PurchaseHeader,
  PurchaseItemsTable,
  PurchaseTransportSection,
  PurchaseTotalsSummary,
  PurchaseHistory,
  PurchaseDetailDrawer,
  PurchaseVoidDialog
} from '../../../features/purchases/components';
import { calculatePurchaseTotals } from '../../../features/purchases/calculations';
import {
  PageHeader,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useToast
} from '../../../components/ui';
import type {
  PurchaseItem,
  PurchaseTransport,
  PurchaseDoc
} from '../../../features/purchases/types';

export default function PurchasesPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { suppliers, stores, products } = usePurchaseLookups();

  const isSuperAdmin = user?.role === 'SUPER ADMIN';
  const defaultStore =
    user?.assignedStoreId && user.assignedStoreId !== 'all'
      ? user.assignedStoreId
      : stores[0]?.id || 'store-1';

  // Active view tab: 'entry' or 'history'
  const [activeTab, setActiveTab] = useState('entry');

  // Form State
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [locationId, setLocationId] = useState(defaultStore);
  const [reference, setReference] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<
    'PAID' | 'PARTIALLY_PAID' | 'UNPAID'
  >('PAID');
  const [notes, setNotes] = useState('');

  // Items State (starts with 1 blank item)
  const [items, setItems] = useState<PurchaseItem[]>([
    {
      name: '',
      sku: '',
      barcode: '',
      hsn: '',
      quantity: 1,
      unit: 'unit',
      cost: 0,
      discountPercent: 0,
      discountAmount: 0,
      gstRate: 0,
      taxableValue: 0,
      taxAmount: 0,
      lineTotal: 0
    }
  ]);

  // Transport State
  const [transport, setTransport] = useState<PurchaseTransport>({
    enabled: false,
    transporter: '',
    mode: 'ROAD',
    docketNumber: '',
    transportDate: purchaseDate,
    charge: 0,
    taxRate: 5,
    taxAmount: 0,
    paymentStatus: 'TO_PAY',
    notes: ''
  });

  // Other Charges
  const [otherCharges, setOtherCharges] = useState(0);

  // Detail & Void Modals
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseDoc | null>(
    null
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [purchaseToVoid, setPurchaseToVoid] = useState<PurchaseDoc | null>(null);
  const [isVoidOpen, setIsVoidOpen] = useState(false);

  // Mutations
  const createMutation = useCreatePurchaseMutation();
  const voidMutation = useVoidPurchaseMutation();

  // Pure live totals
  const totals = calculatePurchaseTotals(items, transport, otherCharges);

  // Reset Form
  const resetForm = () => {
    setSupplierName('');
    setInvoiceNumber('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setReference('');
    setNotes('');
    setOtherCharges(0);
    setTransport({
      enabled: false,
      transporter: '',
      mode: 'ROAD',
      docketNumber: '',
      transportDate: new Date().toISOString().split('T')[0],
      charge: 0,
      taxRate: 5,
      taxAmount: 0,
      paymentStatus: 'TO_PAY',
      notes: ''
    });
    setItems([
      {
        name: '',
        sku: '',
        barcode: '',
        hsn: '',
        quantity: 1,
        unit: 'unit',
        cost: 0,
        discountPercent: 0,
        discountAmount: 0,
        gstRate: 0,
        taxableValue: 0,
        taxAmount: 0,
        lineTotal: 0
      }
    ]);
  };

  const handleCreatePurchase = async () => {
    if (!supplierName.trim()) {
      toastError('Supplier Required', 'Please specify the vendor or supplier name.');
      return;
    }

    if (!invoiceNumber.trim()) {
      toastError('Invoice / Bill # Required', 'Please enter the supplier invoice number.');
      return;
    }

    const effectiveLocation = locationId || defaultStore;
    if (!effectiveLocation) {
      toastError('Store Location Required', 'Please specify the destination receiving store.');
      return;
    }

    const validItems = items.filter((it) => it.name.trim() && it.quantity > 0);
    if (validItems.length === 0) {
      toastError('Items Required', 'Please provide at least one valid procurement line item.');
      return;
    }

    const payload = {
      supplierName: supplierName.trim(),
      invoiceNumber: invoiceNumber.trim(),
      purchaseDate,
      locationId: effectiveLocation,
      storeId: effectiveLocation,
      reference: reference.trim(),
      paymentStatus,
      notes: notes.trim(),
      items: validItems,
      transport: transport.enabled ? transport : undefined,
      subtotal: totals.goodsTaxable,
      taxAmount: totals.goodsGstTotal + totals.freightGst,
      shipping: transport.enabled ? transport.charge : 0,
      otherCharges,
      grandTotal: totals.grandTotal,
      status: 'RECEIVED'
    };

    try {
      const res = await createMutation.mutateAsync(payload);
      if (res.success) {
        success(
          'Purchase Recorded',
          `Batch #${res.purchase.id || res.purchase.purchaseId} inward complete and inventory updated.`
        );
        resetForm();
        setActiveTab('history');
      }
    } catch (err: any) {
      toastError('Inward Failed', err?.message || 'Failed to record purchase entry.');
    }
  };

  const handleConfirmVoid = async () => {
    if (!purchaseToVoid) return;
    const targetId = purchaseToVoid.purchaseId || purchaseToVoid.id;

    try {
      await voidMutation.mutateAsync(targetId);
      success(
        'Purchase Voided',
        `Purchase #${targetId} voided and inventory stock batch reversed.`
      );
      setIsVoidOpen(false);
      setPurchaseToVoid(null);
    } catch (err: any) {
      toastError('Void Failed', err?.message || 'Failed to void purchase entry.');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <PageHeader
        title="Procurement & Inward Purchase Entry"
        description="Record vendor inward shipments, line-item GST, transport freight, and stock batch additions."
      />

      {/* Tabs */}
      <Tabs defaultValue="entry" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="entry" className="gap-1.5">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Purchase Entry</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="w-3.5 h-3.5" />
            <span>Inward Purchase History</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: New Entry */}
        <TabsContent value="entry" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              {/* Inward Header */}
              <PurchaseHeader
                supplierName={supplierName}
                onSupplierChange={(name) => setSupplierName(name)}
                invoiceNumber={invoiceNumber}
                onInvoiceNumberChange={setInvoiceNumber}
                purchaseDate={purchaseDate}
                onPurchaseDateChange={setPurchaseDate}
                locationId={locationId}
                onLocationChange={setLocationId}
                reference={reference}
                onReferenceChange={setReference}
                paymentStatus={paymentStatus}
                onPaymentStatusChange={setPaymentStatus}
                notes={notes}
                onNotesChange={setNotes}
                suppliers={suppliers}
                stores={stores}
                disabledStore={!isSuperAdmin && !!user?.assignedStoreId && user.assignedStoreId !== 'all'}
              />

              {/* Items Table */}
              <PurchaseItemsTable
                items={items}
                onChange={setItems}
                availableProducts={products}
              />

              {/* Transport & Freight */}
              <PurchaseTransportSection
                transport={transport}
                onChange={setTransport}
              />
            </div>

            {/* Sticky Sidebar: Summary & Totals */}
            <div className="lg:col-span-1">
              <PurchaseTotalsSummary
                totals={totals}
                otherCharges={otherCharges}
                onOtherChargesChange={setOtherCharges}
                onSubmit={handleCreatePurchase}
                isLoading={createMutation.isPending}
                isValid={supplierName.trim().length > 0 && invoiceNumber.trim().length > 0}
              />
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: History */}
        <TabsContent value="history" className="mt-4">
          <PurchaseHistory
            onSelectPurchase={(pur) => {
              setSelectedPurchase(pur);
              setIsDetailOpen(true);
            }}
            onRequestVoid={(pur) => {
              setPurchaseToVoid(pur);
              setIsVoidOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Detail Drawer */}
      <PurchaseDetailDrawer
        purchase={selectedPurchase}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedPurchase(null);
        }}
      />

      {/* Void Dialog */}
      <PurchaseVoidDialog
        purchase={purchaseToVoid}
        isOpen={isVoidOpen}
        isLoading={voidMutation.isPending}
        onClose={() => {
          setIsVoidOpen(false);
          setPurchaseToVoid(null);
        }}
        onConfirm={handleConfirmVoid}
      />
    </div>
  );
}
