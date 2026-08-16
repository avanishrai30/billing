'use client';

import React from 'react';
import { PackageX } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { Skeleton, EmptyState } from '../../../components/ui';
import type { POSProduct, POSCartItem } from '../types';

export interface ProductGridProps {
  products: POSProduct[];
  cartItems: POSCartItem[];
  isLoading: boolean;
  onAddToCart: (product: POSProduct) => void;
  searchQuery?: string;
  categoryFilter?: string;
  onClearFilters?: () => void;
}

export function ProductGrid({
  products,
  cartItems,
  isLoading,
  onAddToCart,
  searchQuery = '',
  categoryFilter = 'ALL',
  onClearFilters
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-[#032154] border border-white/10 rounded-2xl p-3.5 space-y-3"
          >
            <Skeleton variant="rectangular" className="w-full h-28 rounded-xl" />
            <Skeleton variant="text" className="w-1/2 h-3" />
            <Skeleton variant="text" className="w-full h-4" />
            <div className="flex justify-between items-center pt-2">
              <Skeleton variant="text" className="w-16 h-5" />
              <Skeleton variant="rectangular" className="w-14 h-7 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    const hasFilter = searchQuery || categoryFilter !== 'ALL';
    return (
      <EmptyState
        icon={<PackageX className="w-8 h-8 text-slate-400" />}
        title={hasFilter ? 'No Matching Products' : 'Product Catalog Empty'}
        description={
          hasFilter
            ? `No products match "${searchQuery || categoryFilter}". Try adjusting your search query or selected category.`
            : 'No active products found in the catalog. Products created in Product Master will appear here.'
        }
        actionLabel={hasFilter ? 'Clear Filters' : undefined}
        onAction={hasFilter ? onClearFilters : undefined}
      />
    );
  }

  // Create quick lookup for cart quantities
  const cartQtyMap = new Map<string, number>();
  for (const item of cartItems) {
    cartQtyMap.set(item.productId, item.quantity);
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
      {products.map((prod) => (
        <ProductCard
          key={prod.id || prod._id || prod.sku}
          product={prod}
          cartQuantity={cartQtyMap.get(prod.id) || 0}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}
