'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { Dialog, Button, Badge, Select } from '../../../components/ui';
import { useBulkImportPreviewMutation, useBulkImportCommitMutation } from '../hooks';
import type { BulkImportPreviewResult, BulkImportPreviewRow } from '../types';

export interface ProductImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLocationId?: string;
}

export function ProductImportDialog({
  isOpen,
  onClose,
  defaultLocationId = 'all'
}: ProductImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [parsedRows, setParsedRows] = useState<unknown[]>([]);
  const [previewData, setPreviewData] = useState<BulkImportPreviewResult | null>(null);
  const [strategy, setStrategy] = useState<'ADD_AND_UPDATE' | 'ADD_ONLY' | 'UPDATE_ONLY'>('ADD_AND_UPDATE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [commitSummary, setCommitSummary] = useState<{ imported: number; created: number; updated: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewMutation = useBulkImportPreviewMutation();
  const commitMutation = useBulkImportCommitMutation();

  const handleReset = () => {
    setStep('upload');
    setParsedRows([]);
    setPreviewData(null);
    setErrorMsg(null);
    setCommitSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Simple CSV parser for browser client
  const parseCSV = (csvText: string): Record<string, string>[] => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });
      rows.push(obj);
    }
    return rows;
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        let rows: unknown[] = [];

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          rows = Array.isArray(parsed) ? parsed : [parsed];
        } else {
          rows = parseCSV(text);
        }

        if (rows.length === 0) {
          setErrorMsg('No readable rows found in the selected file.');
          return;
        }

        setParsedRows(rows);

        // Run backend preview pre-validation
        const preview = await previewMutation.mutateAsync({
          rows,
          options: {
            strategy,
            defaultLocationId: defaultLocationId === 'all' ? 'default' : defaultLocationId
          }
        });

        setPreviewData(preview);
        setStep('preview');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to parse and validate import file.';
        setErrorMsg(msg);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Error reading uploaded file.');
    };

    reader.readAsText(file);
  };

  const handleExecuteCommit = async () => {
    if (!previewData) return;
    setErrorMsg(null);

    try {
      const res = await commitMutation.mutateAsync({
        importId: previewData.importId,
        rows: previewData.rows,
        options: {
          strategy,
          defaultLocationId: defaultLocationId === 'all' ? 'default' : defaultLocationId
        }
      });

      if (res.success) {
        setCommitSummary({
          imported: res.imported,
          created: res.summary?.created || 0,
          updated: res.summary?.updated || 0
        });
        setStep('success');
      } else {
        setErrorMsg('Import commit completed with errors.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error committing bulk import.';
      setErrorMsg(msg);
    }
  };

  const strategyOptions = [
    { value: 'ADD_AND_UPDATE', label: 'Create new SKUs & Update existing matches' },
    { value: 'ADD_ONLY', label: 'Create new SKUs only (Skip existing)' },
    { value: 'UPDATE_ONLY', label: 'Update existing SKUs only' }
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Intelligent Bulk Product Import"
      description="Batch register product SKUs, prices, tax categories, and opening stock."
      maxWidth="lg"
    >
      <div className="space-y-5">
        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium"
          >
            {errorMsg}
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Import Strategy & Collision Resolution
              </label>
              <Select
                options={strategyOptions}
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as typeof strategy)}
              />
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 hover:border-sky-400/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-white/[0.02] hover:bg-white/[0.04]"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelected}
                accept=".csv,.json"
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">Click or drag CSV / JSON file to upload</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Supported columns: SKU, Name, Category, Brand, Cost Price, Selling Price, GST, Unit, Barcode.
              </p>
            </div>

            {previewMutation.isPending && (
              <div className="flex items-center justify-center gap-2 text-xs text-sky-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating catalog schema and checking collisions...
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Pre-Validation Preview */}
        {step === 'preview' && previewData && (
          <div className="space-y-4">
            {/* KPI Summary */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Rows</span>
                <span className="text-base font-bold font-mono text-white">{previewData.totalRows}</span>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider block">Valid Rows</span>
                <span className="text-base font-bold font-mono text-emerald-300">{previewData.validRows}</span>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                <span className="text-[10px] text-amber-400 uppercase tracking-wider block">Warnings</span>
                <span className="text-base font-bold font-mono text-amber-300">{previewData.warningRows}</span>
              </div>
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                <span className="text-[10px] text-rose-400 uppercase tracking-wider block">Error Rows</span>
                <span className="text-base font-bold font-mono text-rose-300">{previewData.errorRows}</span>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-white/10 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="bg-[#131d33] text-slate-300 sticky top-0">
                  <tr>
                    <th className="p-2.5 border-b border-white/10">Row</th>
                    <th className="p-2.5 border-b border-white/10">Status</th>
                    <th className="p-2.5 border-b border-white/10">Action</th>
                    <th className="p-2.5 border-b border-white/10">SKU</th>
                    <th className="p-2.5 border-b border-white/10">Name</th>
                    <th className="p-2.5 border-b border-white/10">Price (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-[#0f172a]">
                  {previewData.rows.slice(0, 50).map((r, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="p-2.5 text-slate-400">{r.rowNumber}</td>
                      <td className="p-2.5">
                        <Badge
                          variant={
                            r.status === 'VALID' ? 'success' : r.status === 'WARNING' ? 'warning' : 'danger'
                          }
                          size="sm"
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-slate-300">{r.action}</td>
                      <td className="p-2.5 text-white font-bold">{r.sku}</td>
                      <td className="p-2.5 text-slate-200 truncate max-w-[160px]">{r.name}</td>
                      <td className="p-2.5 text-emerald-400">₹{r.sellingPrice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Upload Different File
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteCommit}
                isLoading={commitMutation.isPending}
                disabled={previewData.validRows === 0}
              >
                Commit {previewData.validRows} Valid SKUs
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Success Confirmation */}
        {step === 'success' && commitSummary && (
          <div className="space-y-4 text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Import Committed Successfully</h3>
              <p className="text-xs text-slate-400 mt-1">
                Successfully processed <strong className="text-white font-mono">{commitSummary.imported}</strong> catalog SKUs.
              </p>
            </div>

            <div className="flex justify-center gap-4 text-xs font-mono">
              <span className="text-emerald-400">Created: {commitSummary.created}</span>
              <span className="text-sky-400">Updated: {commitSummary.updated}</span>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-center">
              <Button variant="primary" size="sm" onClick={handleClose}>
                Done & View Catalog
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
