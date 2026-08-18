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
    if (typeof val === 'boolean') return <span className="text-indigo-700 font-mono">{String(val)}</span>;
    if (typeof val === 'number') return <span className="text-emerald-700 font-mono">{val}</span>;
    if (typeof val === 'string') {
      if (val === '[REDACTED]') {
        return <span className="text-rose-700 font-mono font-bold bg-rose-50 px-1 py-0.5 rounded border border-rose-200">[REDACTED]</span>;
      }
      return <span className="text-blue-700">"{val}"</span>;
    }
    if (Array.isArray(val)) {
      return (
        <span className="text-slate-700 font-mono text-xs">
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
      <pre className="text-[11px] font-mono text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-200 overflow-x-auto whitespace-pre-wrap">
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
      {title && <h4 className="text-xs font-semibold text-slate-900">{title}</h4>}

      {/* Field Changes Table if diff exists */}
      {diffs.length > 0 && !isCreation && !isDeletion && (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-between">
            <span>State Mutation Diffs</span>
            <span className="text-[10px] text-slate-400 font-mono">({diffs.length} fields modified)</span>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {diffs.map((diff) => (
              <div key={diff.key} className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
                <div className="font-mono text-slate-400 font-semibold">{diff.key}:</div>
                <div className="bg-rose-50/70 p-2 rounded border border-rose-200">
                  <div className="text-[10px] text-rose-700 font-semibold mb-1">Before</div>
                  {renderValue(diff.before)}
                </div>
                <div className="bg-emerald-50/70 p-2 rounded border border-emerald-200">
                  <div className="text-[10px] text-emerald-700 font-semibold mb-1">After</div>
                  {renderValue(diff.after)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creation snapshot */}
      {isCreation && (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
          <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-100 text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <span>Created Resource Snapshot</span>
            <span className="text-[10px] text-slate-400 font-mono">({Object.keys(sanitizedAfter).length} fields)</span>
          </div>
          <div className="p-3 divide-y divide-slate-100 text-xs">
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
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
          <div className="bg-rose-50 px-3 py-2 border-b border-rose-100 text-xs font-semibold text-rose-800 flex items-center justify-between">
            <span>Deleted Resource Snapshot (Before Deletion)</span>
            <span className="text-[10px] text-slate-400 font-mono">({Object.keys(sanitizedBefore).length} fields)</span>
          </div>
          <div className="p-3 divide-y divide-slate-100 text-xs">
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
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center text-slate-500 text-xs italic">
          No payload data recorded for this event.
        </div>
      )}
    </div>
  );
}
