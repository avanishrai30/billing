'use client';

import React from 'react';
import { calculatePayloadDiff, redactSensitivePayload } from '../calculations';

export interface AuditPayloadViewerProps {
  before?: Record<string, any>;
  after?: Record<string, any>;
  title?: string;
}

export function AuditPayloadViewer({ before, after, title }: AuditPayloadViewerProps) {
  const diffs = React.useMemo(() => {
    return calculatePayloadDiff(before, after);
  }, [before, after]);

  const sanitizedAfter = React.useMemo(() => {
    return redactSensitivePayload(after || {});
  }, [after]);

  const sanitizedBefore = React.useMemo(() => {
    return redactSensitivePayload(before || {});
  }, [before]);

  const renderValue = (val: any) => {
    if (val === undefined) return <span className="text-slate-500 italic">undefined</span>;
    if (val === null) return <span className="text-slate-500 italic">null</span>;
    if (typeof val === 'boolean') return <span className="text-purple-300 font-mono">{String(val)}</span>;
    if (typeof val === 'number') return <span className="text-emerald-300 font-mono">{val}</span>;
    if (typeof val === 'string') {
      if (val === '[REDACTED]') {
        return <span className="text-rose-400 font-mono font-bold bg-rose-500/10 px-1 py-0.5 rounded border border-rose-500/20">[REDACTED]</span>;
      }
      return <span className="text-sky-200">"{val}"</span>;
    }
    if (Array.isArray(val)) {
      return (
        <span className="text-slate-300 font-mono text-xs">
          [{val.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && ', '}
              {typeof item === 'object' ? JSON.stringify(redactSensitivePayload(item)) : String(item)}
            </React.Fragment>
          ))}]
        </span>
      );
    }
    return (
      <pre className="text-[11px] font-mono text-slate-300 bg-black/40 p-1.5 rounded border border-white/5 overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(redactSensitivePayload(val), null, 2)}
      </pre>
    );
  };

  // If before is completely empty and after has values (e.g. creation event)
  const isCreation = (!before || Object.keys(before).length === 0) && after && Object.keys(after).length > 0;
  // If after is empty and before has values (e.g. deletion event)
  const isDeletion = (!after || Object.keys(after).length === 0) && before && Object.keys(before).length > 0;

  return (
    <div className="space-y-4">
      {title && <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{title}</h4>}

      {/* Field Changes Table if diff exists */}
      {diffs.length > 0 && !isCreation && !isDeletion && (
        <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
          <div className="bg-[#021b47] px-3 py-2 border-b border-white/10 text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>State Mutation Diffs</span>
            <span className="text-[10px] text-slate-400 font-mono">({diffs.length} fields modified)</span>
          </div>
          <div className="divide-y divide-white/5 text-xs">
            {diffs.map((diff) => (
              <div key={diff.key} className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
                <div className="font-mono text-slate-400 font-semibold">{diff.key}:</div>
                <div className="bg-rose-500/5 p-2 rounded border border-rose-500/15">
                  <div className="text-[10px] text-rose-400 font-bold uppercase mb-1">Before</div>
                  {renderValue(diff.before)}
                </div>
                <div className="bg-emerald-500/5 p-2 rounded border border-emerald-500/15">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase mb-1">After</div>
                  {renderValue(diff.after)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creation snapshot */}
      {isCreation && (
        <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
          <div className="bg-[#021b47] px-3 py-2 border-b border-white/10 text-xs font-bold text-emerald-300 flex items-center justify-between">
            <span>Created Resource Snapshot</span>
            <span className="text-[10px] text-slate-400 font-mono">({Object.keys(sanitizedAfter).length} fields)</span>
          </div>
          <div className="p-3 divide-y divide-white/5 text-xs">
            {Object.entries(sanitizedAfter).map(([k, v]) => (
              <div key={k} className="py-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
                <span className="font-mono text-slate-400">{k}:</span>
                <span className="sm:col-span-2">{renderValue(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deletion snapshot */}
      {isDeletion && (
        <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
          <div className="bg-[#021b47] px-3 py-2 border-b border-white/10 text-xs font-bold text-rose-300 flex items-center justify-between">
            <span>Deleted Resource Snapshot (Before Deletion)</span>
            <span className="text-[10px] text-slate-400 font-mono">({Object.keys(sanitizedBefore).length} fields)</span>
          </div>
          <div className="p-3 divide-y divide-white/5 text-xs">
            {Object.entries(sanitizedBefore).map(([k, v]) => (
              <div key={k} className="py-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
                <span className="font-mono text-slate-400">{k}:</span>
                <span className="sm:col-span-2">{renderValue(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty payload */}
      {!isCreation && !isDeletion && diffs.length === 0 && (
        <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-center text-slate-500 text-xs italic">
          No payload data recorded for this event.
        </div>
      )}
    </div>
  );
}
