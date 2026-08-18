'use client';

import React from 'react';

export interface CategoryBarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

export function CategoryBar({
  categories,
  selectedCategory,
  onSelectCategory
}: CategoryBarProps) {
  const allCategories = ['ALL', ...categories.filter((c) => c && c !== 'ALL')];

  return (
    <div
      role="tablist"
      aria-label="Product Categories"
      className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin no-scrollbar"
    >
      {allCategories.map((cat) => {
        const isSelected = selectedCategory === cat;
        const displayName = cat === 'ALL' ? 'All Products' : cat;

        return (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex-shrink-0 focus-ring ${
              isSelected
                ? 'bg-blue-700 text-white shadow-[0_8px_18px_rgba(37,99,235,0.16)]'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            {displayName}
          </button>
        );
      })}
    </div>
  );
}
