'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = ''
}: PaginationProps) {
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 shadow-xs ${className}`}
    >
      {totalItems !== undefined ? (
        <div className="font-mono text-slate-500">
          Showing{' '}
          <span className="text-slate-900 font-medium">
            {totalItems === 0 ? 0 : (currentPage - 1) * (pageSize || 10) + 1}
          </span>{' '}
          to{' '}
          <span className="text-slate-900 font-medium">
            {Math.min(currentPage * (pageSize || 10), totalItems)}
          </span>{' '}
          of <span className="text-slate-900 font-medium">{totalItems}</span> entries
        </div>
      ) : (
        <div className="font-mono text-slate-500">
          Page <span className="text-slate-900 font-medium">{currentPage}</span> of{' '}
          <span className="text-slate-900 font-medium">{Math.max(totalPages, 1)}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canPrev}
          onClick={() => onPageChange(currentPage - 1)}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Previous
        </Button>
        <div className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg font-mono text-xs text-slate-700">
          {currentPage} / {Math.max(totalPages, 1)}
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canNext}
          onClick={() => onPageChange(currentPage + 1)}
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
