'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  usePOSProductsQuery,
  usePOSCustomersQuery,
  usePOSStoresQuery,
  useCreateInvoiceMutation
} from '../../../features/pos/hooks';
import {
  POSHeader,
  ProductSearch,
  CategoryBar,
  ProductGrid,
  Cart,
  PaymentPanel,
  BarcodeInput
} from '../../../features/pos/components';
import {
  calculatePOSLine,
  calculatePOSTotals
} from '../../../features/pos/calculations';
import { posApi } from '../../../features/pos/api';
import { Drawer, useToast, AccessDeniedState } from '../../../components/ui';
import type {
  POSProduct,
  POSCartItem,
  POSCustomer,
  PaymentMode,
  POSCheckoutPayload
} from '../../../features/pos/types';

export default function POSTerminalPage() {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission('invoices.create');
  const { success, error: toastError, info } = useToast();

  const { data: products = [], isLoading: isLoadingProducts } = usePOSProductsQuery();
  const { data: customers = [] } = usePOSCustomersQuery();
  const { data: stores = [] } = usePOSStoresQuery();

  const createInvoiceMutation = useCreateInvoiceMutation();

  // Local State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cartItems, setCartItems] = useState<POSCartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomer | null>(null);
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  if (!canCreate) {
    return (
      <AccessDeniedState
        title="POS Terminal Restricted"
        message="Your role permissions do not authorize creating point-of-sale customer invoices or processing checkout transactions."
        requiredPermission="invoices.create"
      />
    );
  }

  // Active Store location resolution
  const userStore = stores.find((s) => s.id === user?.assignedStoreId);
  const storeName = userStore?.name || (user?.assignedStoreId === 'all' ? 'All Outlets' : 'Default Store');
  const effectiveLocationId =
    user?.assignedStoreId && user.assignedStoreId !== 'all'
      ? user.assignedStoreId
      : stores[0]?.id || 'store-1';

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
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.productId === product.id);
      const price = Number(product.sellingPrice ?? product.price ?? 0);
      const cost = Number(product.purchasePrice ?? product.cost ?? 0);
      const gst = Number(product.gst ?? product.tax ?? 0);

      if (existingIdx >= 0) {
        // Increment existing
        const existing = prev[existingIdx];
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
          stockAvailable: product.stock,
          ...calc
        };
        return [...prev, newItem];
      }
    });
  }, []);

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
  }, [products, handleAddToCart]);

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
  }, []);

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

      // 2. Query server for barcode lookup
      try {
        const remoteProduct = await posApi.getProductByBarcode(clean);
        if (remoteProduct) {
          handleAddToCart(remoteProduct);
          info('Item Added', `${remoteProduct.name} added to cart`);
        } else {
          toastError('Item Not Found', `No product found matching barcode "${clean}"`);
        }
      } catch {
        toastError('Lookup Error', `Failed to resolve barcode "${clean}"`);
      }
    },
    [products, handleAddToCart, info, toastError]
  );

  // Complete Checkout Handler
  const handleConfirmPayment = async ({
    paymentMode,
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

    const payload: POSCheckoutPayload = {
      transactionId: `TXN-${Date.now()}`,
      invoiceNumber: `INV-${Date.now()}`,
      locationId: effectiveLocationId,
      storeId: effectiveLocationId,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomer?.phone,
      paymentMode,
      paymentMethod: paymentMode,
      items: cartItems.map((it) => ({
        productId: it.productId,
        name: it.name,
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
        />
      </div>

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
            onOpenCheckout={() => setIsCheckoutOpen(true)}
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
              setIsCheckoutOpen(true);
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
        isLoading={createInvoiceMutation.isPending}
      />
    </div>
  );
}
