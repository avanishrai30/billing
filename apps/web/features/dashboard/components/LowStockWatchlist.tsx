'use client';

import React from 'react';
import { AlertTriangle, PackageCheck } from 'lucide-react';
import {
  Card,
  SectionHeader,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Badge,
  EmptyState
} from '../../../components/ui';
import type { LowStockItem } from '../types';

export interface LowStockWatchlistProps {
  items: LowStockItem[];
}

export function LowStockWatchlist({ items }: LowStockWatchlistProps) {
  return (
    <Card variant="default">
      <SectionHeader
        title="Low Stock & Reorder Watchlist"
        subtitle="SKUs breaching configured inventory replenishment thresholds"
        action={
          items.length > 0 ? (
            <Badge variant="warning" dot size="sm">
              {items.length} Threshold Alerts
            </Badge>
          ) : (
            <Badge variant="success" dot size="sm">
              Optimal Stock
            </Badge>
          )
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<PackageCheck className="w-6 h-6 text-emerald-400" />}
          title="All Stock Levels Healthy"
          description="There are currently zero inventory items below their reorder threshold."
        />
      ) : (
        <Table density="dense">
          <TableHeader>
            <tr>
              <TableHead>SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead isNumeric>Available Stock</TableHead>
              <TableHead isNumeric>Reorder Level</TableHead>
              <TableHead isNumeric>Unit Cost</TableHead>
              <TableHead align="center">Status</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const isOutOfStock = item.stock <= 0;
              return (
                <TableRow key={item.id || item.sku}>
                  <TableCell className="font-mono text-slate-400 text-[11px]">
                    {item.sku || 'N/A'}
                  </TableCell>
                  <TableCell className="font-semibold text-white">
                    {item.name}
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-400 text-xs">{item.category}</span>
                  </TableCell>
                  <TableCell isNumeric>
                    <span
                      className={`font-semibold ${
                        isOutOfStock ? 'text-rose-400 font-bold' : 'text-amber-400'
                      }`}
                    >
                      {item.stock} {item.unit}
                    </span>
                  </TableCell>
                  <TableCell isNumeric className="text-slate-400">
                    {item.reorder} {item.unit}
                  </TableCell>
                  <TableCell isNumeric className="text-slate-300">
                    ₹ {item.cost.toFixed(2)}
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={isOutOfStock ? 'danger' : 'warning'} size="sm">
                      {isOutOfStock ? 'Out of Stock' : 'Reorder'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
