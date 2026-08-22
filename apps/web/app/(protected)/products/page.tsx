'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useProductsQuery } from '../../../features/products/hooks';
import { useRealtimeHighlight } from '../../../lib/realtime/useRealtimeHighlight';
import {
  ProductHeader,
  ProductSummaryCards,
  ProductFilters,
  ProductTable,
  ProductModal,
  ProductDetailDrawer,
  ProductArchiveDialog,
  ProductImportDialog
} from '../../../features/products/components';
import { calculateProductSummaryMetrics } from '../../../features/products/calculations';
import { AccessDeniedState, ErrorState } from '../../../components/ui';
import type { ProductDoc, ProductFilterState } from '../../../features/products/types';

export default function ProductsPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('products.view');
  const canCreate = hasPermission('products.create');
  const canEdit = hasPermission('products.update');
  const canArchive = hasPermission('products.archive');
  const canImport = hasPermission('products.import.preview');
  const canCommitImport = hasPermission('products.import.commit');

  const { triggerHighlight, highlightedIds } = useRealtimeHighlight(1500);

  // Filter State
  const [filters, setFilters] = useState<ProductFilterState>({
    search: '',
    category: 'all',
    brand: 'all',
    type: 'all',
    sellingMode: 'all',
    status: 'active'
  });

  // Modals & Dialog State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDoc | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [inspectingProduct, setInspectingProduct] = useState<ProductDoc | null>(null);

  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archivingProduct, setArchivingProduct] = useState<ProductDoc | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);

  // Queries with realtime highlight callback
  const { data: products = [], isLoading, isError, error, refetch } = useProductsQuery(
    filters,
    (updatedId) => triggerHighlight(updatedId)
  );

  // Dynamic Options (Categories, Brands, Suppliers)
  const { categories, brands, suppliers } = useMemo(() => {
    const catSet = new Set<string>();
    const brandSet = new Set<string>();
    const supSet = new Set<string>();

    products.forEach((p) => {
      if (p.category && p.category.trim()) catSet.add(p.category.trim());
      if (p.brand && p.brand.trim()) brandSet.add(p.brand.trim());
      if (p.supplier && p.supplier.trim()) supSet.add(p.supplier.trim());
    });

    return {
      categories: Array.from(catSet).sort(),
      brands: Array.from(brandSet).sort(),
      suppliers: Array.from(supSet).sort()
    };
  }, [products]);

  // Client Filtered Products (memoized)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search Query
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchSku = (p.sku || '').toLowerCase().includes(q);
        const matchBarcode = (p.barcode || '').toLowerCase().includes(q);
        const matchBrand = (p.brand || '').toLowerCase().includes(q);
        const matchSecondaryBarcode = (p.barcodes || []).some((b) =>
          (b.barcode || '').toLowerCase().includes(q)
        );

        if (!matchName && !matchSku && !matchBarcode && !matchBrand && !matchSecondaryBarcode) {
          return false;
        }
      }

      // 2. Category
      if (filters.category !== 'all' && p.category !== filters.category) {
        return false;
      }

      // 3. Brand
      if (filters.brand !== 'all' && p.brand !== filters.brand) {
        return false;
      }

      // 4. Ownership Type
      if (filters.type !== 'all') {
        const pType = (p.type || 'OWN').toUpperCase();
        if (pType !== filters.type) return false;
      }

      // 5. Selling Mode
      if (filters.sellingMode !== 'all') {
        const mode = p.sellingMode || 'packaged';
        if (mode !== filters.sellingMode) return false;
      }

      // 6. Status
      if (filters.status === 'archived') {
        if (!p.isArchived && p.status !== 'archived') return false;
      } else if (filters.status === 'active') {
        if (p.isArchived || p.status === 'archived') return false;
      }

      return true;
    });
  }, [products, filters]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    return calculateProductSummaryMetrics(products);
  }, [products]);

  const handleFilterChange = (updates: Partial<ProductFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      brand: 'all',
      type: 'all',
      sellingMode: 'all',
      status: 'active'
    });
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: ProductDoc) => {
    setEditingProduct(prod);
    setIsModalOpen(true);
  };

  const handleOpenInspect = (prod: ProductDoc) => {
    setInspectingProduct(prod);
    setIsDrawerOpen(true);
  };

  const handleOpenArchive = (prod: ProductDoc) => {
    setArchivingProduct(prod);
    setIsArchiveOpen(true);
  };

  if (!canView) {
    return (
      <AccessDeniedState
        title="Product Master Restricted"
        message="Your role permissions do not authorize browsing catalog SKU master records."
        requiredPermission="products.view"
      />
    );
  }

  return (
    <div className="space-y-4 pb-10">
      <ProductHeader
        canCreate={canCreate}
        canImport={canImport}
        onOpenCreate={handleOpenCreate}
        onOpenImport={() => setIsImportOpen(true)}
      />

      <ProductSummaryCards metrics={summaryMetrics} isLoading={isLoading} />

      <ProductFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        categories={categories}
        brands={brands}
        totalResults={filteredProducts.length}
      />

      {isError ? (
        <ErrorState
          title="Failed to Load Product Catalog"
          message={
            error instanceof Error
              ? error.message
              : 'Could not synchronize product master items from the backend database.'
          }
          onRetry={() => refetch()}
        />
      ) : (
        <ProductTable
          products={filteredProducts}
          isLoading={isLoading}
          canEdit={canEdit}
          canArchive={canArchive}
          highlightedIds={highlightedIds}
          onInspect={handleOpenInspect}
          onEdit={handleOpenEdit}
          onArchive={handleOpenArchive}
        />
      )}

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        categories={categories}
        brands={brands}
        suppliers={suppliers}
      />

      <ProductDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        product={inspectingProduct}
        onEdit={handleOpenEdit}
        onArchive={handleOpenArchive}
        canEdit={canEdit}
        canArchive={canArchive}
      />

      <ProductArchiveDialog
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        product={archivingProduct}
      />

      <ProductImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        canCommit={canCommitImport}
      />
    </div>
  );
}
