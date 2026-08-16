'use client';

import React, { useRef } from 'react';
import { Search, X, Barcode } from 'lucide-react';
import { Input, IconButton } from '../../../components/ui';

export interface ProductSearchProps {
  value: string;
  onChange: (val: string) => void;
  onBarcodeEnter?: (barcode: string) => void;
  placeholder?: string;
}

export function ProductSearch({
  value,
  onChange,
  onBarcodeEnter,
  placeholder = 'Search by product name, SKU, or scan barcode...'
}: ProductSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      onBarcodeEnter?.(value.trim());
    }
  };

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        leftIcon={<Search className="w-4 h-4 text-slate-400" />}
      />
      <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center z-10">
        {value ? (
          <IconButton
            aria-label="Clear search"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            icon={<X className="w-3.5 h-3.5 text-slate-400" />}
          />
        ) : (
          <div className="p-1 text-slate-400 pointer-events-none">
            <Barcode className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
