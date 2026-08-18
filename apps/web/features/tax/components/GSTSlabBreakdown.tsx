'use client';

import React from 'react';
import { GST_SLAB_COLORS } from '../calculations';
import type { GSTSlabMetrics } from '../types';

export interface GSTSlabBreakdownProps {
  slabs: GSTSlabMetrics[];
}

export function GSTSlabBreakdown({ slabs }: GSTSlabBreakdownProps) {
  const totalTax = slabs.reduce((sum, s) => sum + s.taxAmount, 0);

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.04)] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950 tracking-tight">
            GST Slab Breakdown (CGST & SGST Split)
          </h3>
          <p className="text-xs text-slate-500">
            GST Contribution Distribution across statutory tax brackets (0%, 5%, 12%, 18%)
          </p>
        </div>
        <span className="text-xs font-mono font-semibold text-emerald-700 tabular-nums">
          Total GST: ₹{totalTax.toFixed(2)}
        </span>
      </div>

      {/* Stacked Proportional Distribution Bar */}
      <div className="space-y-2">
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
          {totalTax > 0 ? (
            slabs.map((slab) => {
              if (slab.taxAmount <= 0) return null;
              const color = GST_SLAB_COLORS[String(slab.rate)] || '#94a3b8';
              return (
                <div
                  key={slab.rate}
                  style={{ width: `${slab.sharePercent}%`, backgroundColor: color }}
                  title={`${slab.rate}% Slab: ${slab.sharePercent}% of total tax`}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                />
              );
            })
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
              No taxable transactions recorded
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex gap-4 flex-wrap text-xs text-slate-600 font-medium">
          {slabs.map((slab) => {
            const color = GST_SLAB_COLORS[String(slab.rate)] || '#94a3b8';
            return (
              <div key={slab.rate} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span>
                  {slab.rate}% Rate ({slab.sharePercent}% share)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4-Column Slab Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
        {slabs.map((slab) => {
          const color = GST_SLAB_COLORS[String(slab.rate)] || '#94a3b8';
          return (
            <div
              key={slab.rate}
              className="bg-slate-50/80 p-4 rounded-lg border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                  {slab.label}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  {slab.rate}% Rate
                </span>
              </div>

              <div className="text-xl font-semibold text-slate-950 font-mono tabular-nums">
                ₹{slab.taxAmount.toFixed(2)}
              </div>

              {/* Tax Contribution Share Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                  <span>Tax contribution</span>
                  <span>{slab.sharePercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${slab.sharePercent}%`, backgroundColor: color }}
                  />
                </div>
              </div>

              {/* Base turnover and CGST/SGST splitting */}
              <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Taxable Turnover:</span>
                  <span className="text-slate-900 font-mono font-medium tabular-nums">
                    ₹{slab.taxableValue.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-white p-1.5 rounded text-center border border-slate-200">
                    <span className="text-[9px] text-slate-500 font-semibold block">
                      CGST ({slab.rate > 0 ? slab.rate / 2 : 0}%)
                    </span>
                    <span className="text-xs font-mono font-semibold text-amber-700 tabular-nums">
                      ₹{slab.cgst.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-white p-1.5 rounded text-center border border-slate-200">
                    <span className="text-[9px] text-slate-500 font-semibold block">
                      SGST ({slab.rate > 0 ? slab.rate / 2 : 0}%)
                    </span>
                    <span className="text-xs font-mono font-semibold text-emerald-700 tabular-nums">
                      ₹{slab.sgst.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
