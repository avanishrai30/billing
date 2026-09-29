'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  usePOSProductsQuery,
  usePOSCustomersQuery,
  usePOSStoresQuery,
  useCreateInvoiceMutation,
  useExchangeMutation
} from '../../../features/pos/hooks';
import {
  POSHeader,
  ProductSearch,
  CategoryBar,
  ProductGrid,
  Cart,
  PaymentPanel,
  BarcodeInput,
  POSSuccessModal,
  ReturnExchangeModal
} from '../../../features/pos/components';
import {
  calculatePOSLine,
  calculatePOSTotals
} from '../../../features/pos/calculations';
import { posApi } from '../../../features/pos/api';
import { useStoreScope } from '../../../providers/StoreScopeProvider';
import { useReceiptTemplateQuery } from '../../../features/settings/hooks';
import { Drawer, useToast, AccessDeniedState, Badge, Button, Dialog } from '../../../components/ui';
import { ArrowLeftRight, X } from 'lucide-react';
import type {
  POSProduct,
  POSCartItem,
  POSCustomer,
  PaymentMode,
  POSCheckoutPayload,
  POSInvoiceDoc
} from '../../../features/pos/types';

export default function POSTerminalPage() {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission('invoices.create');
  const { success, error: toastError, info } = useToast();
  const { activeStoreId, activeStore, isRestricted, switchStore } = useStoreScope();

  const { data: stores = [] } = usePOSStoresQuery();

  // User store restrictions
  const isStoreRestricted = isRestricted || Boolean(user?.assignedStoreId && user.assignedStoreId !== 'all');
  const isLocationLocked = isStoreRestricted;

  // POS Location Selection with session persistence
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('aiavro_pos_location_id');
      if (stored) return stored;
    }
    return '';
  });

  // Calculate authoritative effectiveLocationId
  const effectiveLocationId = useMemo(() => {
    if (isStoreRestricted) {
      return user?.assignedStoreId || activeStoreId || 'store-1';
    }

    // Global / Super Admin resolution:
    // 1. If user explicitly selected location in POS session and it matches an active store
    if (selectedLocationId && stores.some((s) => s.id === selectedLocationId)) {
      return selectedLocationId;
    }

    // 2. If activeStoreId in StoreScope is a specific store
    if (activeStoreId && activeStoreId !== 'all' && stores.some((s) => s.id === activeStoreId)) {
      return activeStoreId;
    }

    // 3. Fallback to first active retail store (NON-warehouse)
    const firstRetailStore = stores.find(
      (s) => !s.isWarehouse && s.locationType !== 'WAREHOUSE' && s.status !== 'inactive'
    );
    if (firstRetailStore) {
      return firstRetailStore.id;
    }

    // 4. Fallback to first available store if no retail stores exist
    return stores[0]?.id || 'store-1';
  }, [isStoreRestricted, user?.assignedStoreId, activeStoreId, selectedLocationId, stores]);

  // Sync to sessionStorage
  useEffect(() => {
    if (effectiveLocationId && typeof window !== 'undefined') {
      sessionStorage.setItem('aiavro_pos_location_id', effectiveLocationId);
    }
  }, [effectiveLocationId]);

  const scopedStore = stores.find((s) => s.id === effectiveLocationId) || activeStore;
  const storeName = scopedStore?.name || (user?.assignedStoreId === 'all' ? 'All Outlets' : 'Default Store');

  const { data: products = [], isLoading: isLoadingProducts } = usePOSProductsQuery({
    locationId: effectiveLocationId
  });
  const { data: customers = [] } = usePOSCustomersQuery();

  const createInvoiceMutation = useCreateInvoiceMutation();
  const exchangeMutation = useExchangeMutation();
  const receiptTemplateQuery = useReceiptTemplateQuery(effectiveLocationId);

  // Local State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cartItems, setCartItems] = useState<POSCartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomer | null>(null);
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isReturnStudioOpen, setIsReturnStudioOpen] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<POSInvoiceDoc | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [pendingLocationId, setPendingLocationId] = useState<string | null>(null);
  const [isSwitchLocationModalOpen, setIsSwitchLocationModalOpen] = useState(false);
  const [exchangeSession, setExchangeSession] = useState<{
    originalInvoice: any;
    returnedItems: Array<{ productId: string; name: string; quantity: number; price: number; gst?: number; lineTotal: number }>;
    returnCredit: number;
  } | null>(null);

  if (!canCreate) {
    return (
      <AccessDeniedState
        title="POS Terminal Restricted"
        message="Your role permissions do not authorize creating point-of-sale customer invoices or processing checkout transactions."
        requiredPermission="invoices.create"
      />
    );
  }

  // Extract unique categories from product list
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    }
    return Array.from(set).sort();
  }, [products]);

  // Client-side instant catalog filtering
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category match
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }
      // Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchSku = (p.sku || '').toLowerCase().includes(q);
        const matchBarcode = (p.barcode || '').toLowerCase().includes(q);
        return matchName || matchSku || matchBarcode;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // Pure cart calculations
  const totals = useMemo(() => {
    return calculatePOSTotals(cartItems, cartDiscount);
  }, [cartItems, cartDiscount]);

  // Cart Operations
  const handleAddToCart = useCallback((product: POSProduct) => {
    const available = typeof product.available === 'number'
      ? product.available
      : typeof product.inventory === 'number'
        ? product.inventory
        : typeof product.stock === 'number'
          ? product.stock
          : null;

    if (available !== null && available <= 0) {
      toastError('Out of Stock', `${product.name} is currently out of stock at ${storeName}.`);
      return;
    }

    setCartItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.productId === product.id);
      const price = Number(product.sellingPrice ?? product.price ?? 0);
      const cost = Number(product.purchasePrice ?? product.cost ?? 0);
      const gst = Number(product.gst ?? product.tax ?? 0);

      if (existingIdx >= 0) {
        // Increment existing
        const existing = prev[existingIdx];
        if (available !== null && existing.quantity >= available) {
          toastError('Stock Limit Reached', `Only ${available} units available for ${product.name} at ${storeName}.`);
          return prev;
        }

        const newQty = existing.quantity + 1;
        const calc = calculatePOSLine({
          price: existing.price,
          quantity: newQty,
          gst: existing.gst,
          discountPercent: existing.discountPercent,
          discountAmount: existing.discountAmount
        });

        const updated = [...prev];
        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          ...calc
        };
        return updated;
      } else {
        // Add new line item
        const calc = calculatePOSLine({
          price,
          quantity: 1,
          gst
        });

        const newItem: POSCartItem = {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit || 'pack',
          price,
          cost,
          gst,
          quantity: 1,
          discountPercent: 0,
          discountAmount: 0,
          stockAvailable: available !== null ? available : product.stock,
          ...calc
        };
        return [...prev, newItem];
      }
    });
  }, [storeName, toastError]);

  const handleIncrementQuantity = useCallback((productId: string) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (!existing) {
        const prod = products.find((p) => p.id === productId);
        if (prod) {
          handleAddToCart(prod);
        }
        return prev;
      }

      if (typeof existing.stockAvailable === 'number' && existing.quantity >= existing.stockAvailable) {
        toastError('Stock Limit Reached', `Only ${existing.stockAvailable} units available for ${existing.name}.`);
        return prev;
      }

      return prev.map((item) => {
        if (item.productId !== productId) return item;
        const newQty = item.quantity + 1;
        const calc = calculatePOSLine({
          price: item.price,
          quantity: newQty,
          gst: item.gst,
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount
        });
        return { ...item, quantity: newQty, ...calc };
      });
    });
  }, [products, handleAddToCart, toastError]);

  const handleDecrementQuantity = useCallback((productId: string) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (!existing) return prev;

      if (existing.quantity <= 1) {
        return prev.filter((i) => i.productId !== productId);
      }

      return prev.map((item) => {
        if (item.productId !== productId) return item;
        const newQty = item.quantity - 1;
        const calc = calculatePOSLine({
          price: item.price,
          quantity: newQty,
          gst: item.gst,
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount
        });
        return { ...item, quantity: newQty, ...calc };
      });
    });
  }, []);

  const handleRemoveItem = useCallback((productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const handleUpdateItemDiscount = useCallback((productId: string, discountPercent: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const calc = calculatePOSLine({
          price: item.price,
          quantity: item.quantity,
          gst: item.gst,
          discountPercent
        });
        return {
          ...item,
          discountPercent,
          discountAmount: 0,
          ...calc
        };
      })
    );
  }, []);

  const handleClearCart = useCallback(() => {
    setCartItems([]);
    setCartDiscount(0);
    setSelectedCustomer(null);
    setExchangeSession(null);
  }, []);

  // Location Switch Handler with Cart Protection
  const handleLocationChange = useCallback((newLocId: string) => {
    if (newLocId === effectiveLocationId) return;

    if (cartItems.length > 0) {
      setPendingLocationId(newLocId);
      setIsSwitchLocationModalOpen(true);
      return;
    }

    setSelectedLocationId(newLocId);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('aiavro_pos_location_id', newLocId);
    }
    if (switchStore) {
      switchStore(newLocId);
    }
    const newStoreName = stores.find((s) => s.id === newLocId)?.name || newLocId;
    info('Outlet Switched', `Active POS billing outlet set to ${newStoreName}`);
  }, [effectiveLocationId, cartItems.length, stores, switchStore, info]);

  const handleConfirmSwitchLocation = useCallback(() => {
    if (pendingLocationId) {
      setCartItems([]);
      setSelectedLocationId(pendingLocationId);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('aiavro_pos_location_id', pendingLocationId);
      }
      if (switchStore) {
        switchStore(pendingLocationId);
      }
      const newStoreName = stores.find((s) => s.id === pendingLocationId)?.name || pendingLocationId;
      info('Outlet Switched', `Cart cleared and active POS billing outlet set to ${newStoreName}`);
      setPendingLocationId(null);
      setIsSwitchLocationModalOpen(false);
    }
  }, [pendingLocationId, stores, switchStore, info]);

  // Pre-checkout stock verification
  const handleOpenCheckout = useCallback(() => {
    if (cartItems.length === 0) {
      toastError('Cart Empty', 'Please add items to cart before proceeding to settlement.');
      return;
    }

    for (const item of cartItems) {
      const prod = products.find((p) => p.id === item.productId);
      const available = prod
        ? (typeof prod.available === 'number' ? prod.available : typeof prod.stock === 'number' ? prod.stock : Infinity)
        : (typeof item.stockAvailable === 'number' ? item.stockAvailable : Infinity);

      if (item.quantity > available) {
        toastError(
          'Insufficient Stock',
          `Cannot checkout: ${item.name} requested quantity (${item.quantity}) exceeds available stock (${available}) at ${storeName}.`
        );
        return;
      }
    }

    setIsCheckoutOpen(true);
  }, [cartItems, products, storeName, toastError]);

  // Barcode / SKU Scanner Handler
  const handleBarcodeScanned = useCallback(
    async (barcode: string) => {
      const clean = barcode.trim();
      if (!clean) return;

      // 1. Search locally in catalog
      const localMatch = products.find(
        (p) =>
          p.barcode === clean ||
          p.sku === clean ||
          p.id === clean ||
          p.name.toLowerCase() === clean.toLowerCase()
      );

      if (localMatch) {
        handleAddToCart(localMatch);
        info('Item Added', `${localMatch.name} added to cart`);
        return;
      }

      // 2. Query server for barcode lookup with active locationId
      try {
        const remoteProduct = await posApi.getProductByBarcode(clean, effectiveLocationId);
        if (remoteProduct) {
          const available = typeof remoteProduct.available === 'number'
            ? remoteProduct.available
            : typeof remoteProduct.inventory === 'number'
              ? remoteProduct.inventory
              : typeof remoteProduct.stock === 'number'
                ? remoteProduct.stock
                : null;

          if (available !== null && available <= 0) {
            toastError('Out of Stock', `${remoteProduct.name} is currently out of stock at ${storeName}.`);
            return;
          }

          handleAddToCart(remoteProduct);
          info('Item Added', `${remoteProduct.name} added to cart`);
        } else {
          toastError('Item Not Found', `No product found matching barcode "${clean}"`);
        }
      } catch {
        toastError('Lookup Error', `Failed to resolve barcode "${clean}"`);
      }
    },
    [products, effectiveLocationId, handleAddToCart, storeName, info, toastError]
  );

  // Complete Checkout / Exchange Handler
  const handleConfirmPayment = async ({
    paymentMode,
    amountPaid,
    notes
  }: {
    paymentMode: PaymentMode;
    amountPaid: number;
    notes?: string;
  }) => {
    if (cartItems.length === 0) {
      toastError('Empty Cart', 'Please add at least one product before checkout.');
      return;
    }

    // Atomic Exchange Flow
    if (exchangeSession) {
      try {
        const origInv = exchangeSession.originalInvoice;
        const res = await exchangeMutation.mutateAsync({
          invoiceId: origInv.invoiceNumber || origInv.id,
          payload: {
            returnedItems: exchangeSession.returnedItems.map((it) => ({
              productId: it.productId,
              quantity: it.quantity
            })),
            replacementItems: cartItems.map((it) => ({
              productId: it.productId,
              name: it.name,
              unit: it.unit,
              quantity: it.quantity,
              price: it.price,
              cost: it.cost,
              gst: it.gst
            })),
            paymentMode,
            reason: 'Customer Item Exchange',
            notes
          }
        });

        if (res.success) {
          success(
            'Exchange Completed',
            `Exchange #${res.exchangeId} processed. Net difference: ₹${res.netDifference?.toFixed(2)}.`
          );
          setCompletedInvoice(res.replacementInvoice);
          setIsSuccessModalOpen(true);
          handleClearCart();
          setIsCheckoutOpen(false);
          setIsMobileCartOpen(false);
          return;
        }
      } catch (err: any) {
        toastError('Exchange Failed', err?.message || 'Failed to process exchange.');
        return;
      }
    }

    // Standard Sale Flow
    const receiptTemplateResult = receiptTemplateQuery.data || await receiptTemplateQuery.refetch().then((result) => result.data);
    const receiptTemplate = receiptTemplateResult?.template;
    if (!receiptTemplate) {
      toastError('Receipt Settings Unavailable', 'Could not resolve receipt settings for this store. Please try again.');
      return;
    }
    const payload: POSCheckoutPayload = {
      transactionId: `TXN-${Date.now()}`,
      invoiceNumber: `INV-${Date.now()}`,
      locationId: effectiveLocationId,
      storeId: effectiveLocationId,
      receiptTemplateId: receiptTemplate.id,
      receiptTemplate,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomer?.phone,
      paymentMode,
      paymentMethod: paymentMode,
      amountPaid,
      changeDue: Math.max(0, Math.round((amountPaid - totals.grandTotal) * 100) / 100),
      items: cartItems.map((it) => ({
        productId: it.productId,
        name: it.name,
        sku: it.sku,
        barcode: products.find((product) => product.id === it.productId)?.barcode,
        unit: it.unit,
        quantity: it.quantity,
        price: it.price,
        sellingPrice: it.price,
        cost: it.cost,
        tax: it.taxAmount,
        gst: it.gst,
        lineTotal: it.lineTotal
      })),
      subtotal: totals.subtotal,
      discount: (totals.itemDiscountTotal || 0) + (totals.cartDiscount || 0),
      tax: totals.taxTotal,
      grandTotal: totals.grandTotal,
      notes
    };

    try {
      const res = await createInvoiceMutation.mutateAsync(payload);
      if (res.success) {
        const invNum = res.invoice?.invoiceNumber || payload.invoiceNumber;
        success(
          'Sale Completed',
          `Invoice #${invNum} generated and inventory decremented.`
        );
        setCompletedInvoice(res.invoice || {
          ...payload,
          id: invNum,
          invoiceNumber: invNum,
          status: 'COMPLETED',
          createdAt: new Date().toISOString()
        } as POSInvoiceDoc);
        setIsSuccessModalOpen(true);
        handleClearCart();
        setIsCheckoutOpen(false);
        setIsMobileCartOpen(false);
      }
    } catch (err: any) {
      toastError('Checkout Failed', err?.message || 'Failed to complete retail invoice sale.');
    }
  };


  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden min-w-0 space-y-3 pb-1">
      <BarcodeInput onBarcodeScanned={handleBarcodeScanned} />

      {/* POS Terminal Header */}
      <div className="shrink-0">
        <POSHeader
          storeName={storeName}
          cashierName={user?.name || user?.username || 'Cashier'}
          itemCount={cartItems.length}
          onOpenMobileCart={() => setIsMobileCartOpen(true)}
          onOpenReturnStudio={() => setIsReturnStudioOpen(true)}
          stores={stores}
          selectedLocationId={effectiveLocationId}
          onSelectLocation={handleLocationChange}
          isLocationLocked={isLocationLocked}
        />
      </div>

      {/* Active Exchange Session Banner */}
      {exchangeSession && (
        <div className="shrink-0 p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="font-semibold text-purple-950">Active Exchange Mode:</span>
            <span className="text-purple-800">
              Returning {exchangeSession.returnedItems.length} item(s) from invoice #{exchangeSession.originalInvoice?.invoiceNumber}
            </span>
            <Badge variant="info" size="sm">
              Credit: ₹{exchangeSession.returnCredit.toFixed(2)}
            </Badge>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setExchangeSession(null)}
            leftIcon={<X className="w-3.5 h-3.5" />}
          >
            Cancel Exchange
          </Button>
        </div>
      )}

      {/* Split Layout: Independent Left Catalog Scroll + Viewport-Pinned Right Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px] gap-4 items-start flex-1 min-h-0 overflow-hidden">
        {/* Left Product Catalog Section */}
        <div className="flex flex-col min-w-0 h-full min-h-0 overflow-hidden">
          {/* Fixed Search & Category Toolbar */}
          <div className="shrink-0 space-y-2 mb-2.5">
            <ProductSearch
              value={searchQuery}
              onChange={setSearchQuery}
              onBarcodeEnter={handleBarcodeScanned}
            />

            <CategoryBar
              categories={availableCategories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          {/* Independently Scrollable Product Grid Region */}
          <div
            data-testid="pos-product-scroll"
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 pb-4"
          >
            <ProductGrid
              products={filteredProducts}
              cartItems={cartItems}
              isLoading={isLoadingProducts}
              onAddToCart={handleAddToCart}
              onIncrement={handleIncrementQuantity}
              onDecrement={handleDecrementQuantity}
              searchQuery={searchQuery}
              categoryFilter={selectedCategory}
              onClearFilters={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
            />
          </div>
        </div>

        {/* Right Fixed / Sticky Cart Checkout Panel (Desktop) */}
        <div className="hidden lg:flex lg:flex-col lg:h-full lg:min-h-0 overflow-hidden">
          <Cart
            items={cartItems}
            totals={totals}
            customer={selectedCustomer}
            customers={customers}
            discount={cartDiscount}
            onSelectCustomer={setSelectedCustomer}
            onIncrementQuantity={handleIncrementQuantity}
            onDecrementQuantity={handleDecrementQuantity}
            onRemoveItem={handleRemoveItem}
            onUpdateItemDiscount={handleUpdateItemDiscount}
            onUpdateCartDiscount={setCartDiscount}
            onClearCart={handleClearCart}
            onOpenCheckout={handleOpenCheckout}
          />
        </div>
      </div>

      {/* Mobile Cart Drawer (< 1024px Viewports) */}
      <Drawer
        isOpen={isMobileCartOpen}
        onClose={() => setIsMobileCartOpen(false)}
        title="POS Sale Cart"
        description={`${cartItems.length} items in current sale ticket`}
        maxWidth="md"
      >
        <div className="h-full flex flex-col -m-6 p-4">
          <Cart
            items={cartItems}
            totals={totals}
            customer={selectedCustomer}
            customers={customers}
            discount={cartDiscount}
            onSelectCustomer={setSelectedCustomer}
            onIncrementQuantity={handleIncrementQuantity}
            onDecrementQuantity={handleDecrementQuantity}
            onRemoveItem={handleRemoveItem}
            onUpdateItemDiscount={handleUpdateItemDiscount}
            onUpdateCartDiscount={setCartDiscount}
            onClearCart={handleClearCart}
            onOpenCheckout={() => {
              setIsMobileCartOpen(false);
              handleOpenCheckout();
            }}
          />
        </div>
      </Drawer>

      {/* Payment & Checkout Modal */}
      <PaymentPanel
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        totals={totals}
        customer={selectedCustomer}
        itemCount={cartItems.length}
        onConfirmPayment={handleConfirmPayment}
        isLoading={createInvoiceMutation.isPending || exchangeMutation.isPending}
      />

      {/* Post-Sale Thermal Receipt & Auto-Print Modal */}
      <POSSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        invoice={completedInvoice}
        storeName={storeName}
        autoPrint={true}
        onNewSale={() => {
          setIsSuccessModalOpen(false);
          handleClearCart();
        }}
      />

      {/* Return & Exchange Studio Modal */}
      <ReturnExchangeModal
        isOpen={isReturnStudioOpen}
        onClose={() => setIsReturnStudioOpen(false)}
        onInitiateExchange={(session) => {
          setExchangeSession(session);
          if (session.originalInvoice?.customerPhone) {
            setSelectedCustomer({
              id: session.originalInvoice.customerId || 'walk-in',
              name: session.originalInvoice.customerName || 'Walk-in Customer',
              phone: session.originalInvoice.customerPhone
            });
          }
          info('Exchange Session Started', `Credit of ₹${session.returnCredit.toFixed(2)} applied. Add replacement items to cart.`);
        }}
      />

      {/* Location Switch Guard Confirmation Modal */}
      <Dialog
        isOpen={isSwitchLocationModalOpen}
        onClose={() => {
          setIsSwitchLocationModalOpen(false);
          setPendingLocationId(null);
        }}
        title="Switch Sales Outlet?"
        description={`Your current cart contains ${cartItems.length} item(s) configured for ${storeName}. Switching to ${stores.find((s) => s.id === pendingLocationId)?.name || 'selected outlet'} will clear the cart because inventory is outlet-specific.`}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsSwitchLocationModalOpen(false);
                setPendingLocationId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmSwitchLocation}
            >
              Clear Cart & Switch Outlet
            </Button>
          </div>
        }
      >
        <p className="text-xs text-slate-600">
          Stock availability is tracked independently per store outlet. To prevent accidental inventory discrepancies, changing outlets requires starting a fresh cart.
        </p>
      </Dialog>
    </div>
  );
}
