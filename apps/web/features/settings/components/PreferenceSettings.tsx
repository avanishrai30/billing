import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  Image,
  CheckCircle2,
  Printer,
  Radio,
  RefreshCw,
  Zap,
  HelpCircle,
  Activity,
  AlertTriangle,
  Play
} from 'lucide-react';
import { Input, Select, Button, Badge } from '../../../components/ui';
import { usePrinterLabelPreferences, useVisualPreferences } from '../hooks';
import {
  LABEL_PROFILE_PRESETS,
  PRINTER_MODEL_PROFILES,
  TVS_LP46_DLITE_PROFILE,
  calculateLabelGeometry,
  calculateLabelTypography,
  calculateBarcodeFit,
  calculateTextFit,
  resolvePrinterModelProfile,
  type DetectedPrinter
} from '../../../lib/utils/labelProfiles';
import { generateBarcodeSvg } from '../../../lib/utils/barcode';
import {
  checkPrintAgentHealth,
  sendNativeCalibrate,
  sendNativeFeed,
  sendNativeTestPrint,
  type PrintAgentHealth
} from '../../../lib/utils/printAgent';

export function PreferenceSettings() {
  const { showProductImages, setShowProductImages, isLoaded } = useVisualPreferences();
  const {
    selectedProfileId,
    selectedProfile,
    customProfile,
    printerName,
    printerType,
    printerModelId,
    printerLanguage,
    mediaType,
    sensorMode,
    gapMm,
    xOffsetMm,
    yOffsetMm,
    printAgentUrl,
    setSelectedProfileId,
    setCustomProfile,
    setPrinterName,
    setPrinterType,
    updatePreferences,
    isLoaded: isPrinterLoaded
  } = usePrinterLabelPreferences();

  const [savedBadge, setSavedBadge] = useState(false);
  const [agentHealth, setAgentHealth] = useState<PrintAgentHealth>({ connected: false });
  const [isCheckingAgent, setIsCheckingAgent] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const applyResolvedPrinter = useCallback((res: PrintAgentHealth) => {
    const detected = res.printers?.[0];
    const resolved = resolvePrinterModelProfile(detected || null);
    if (!res.connected || !resolved) return;
    const printer = typeof detected === 'string' ? { name: detected } : (detected as DetectedPrinter | undefined);
    const nextPrinterName = printer?.model || printer?.name || resolved.name;
    const nextPrinterType = printer?.manufacturer || resolved.manufacturer;
    if (
      printerModelId !== resolved.id ||
      printerName !== nextPrinterName ||
      printerType !== nextPrinterType ||
      printerLanguage !== resolved.language ||
      mediaType !== resolved.defaultMediaType ||
      sensorMode !== resolved.defaultSensor
    ) {
      updatePreferences({
        printerModelId: resolved.id,
        printerName: nextPrinterName,
        printerType: nextPrinterType,
        printerLanguage: resolved.language,
        mediaType: resolved.defaultMediaType,
        sensorMode: resolved.defaultSensor
      });
    }
  }, [mediaType, printerLanguage, printerModelId, printerName, printerType, sensorMode, updatePreferences]);

  const checkAgent = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsCheckingAgent(true);
    const res = await checkPrintAgentHealth(printAgentUrl);
    setAgentHealth(res);
    applyResolvedPrinter(res);
    if (!options?.silent) setIsCheckingAgent(false);
  }, [applyResolvedPrinter, printAgentUrl]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;
    let cancelled = false;
    checkPrintAgentHealth(printAgentUrl).then((res) => {
      if (cancelled) return;
      setAgentHealth(res);
      applyResolvedPrinter(res);
    });
    return () => {
      cancelled = true;
    };
  }, [applyResolvedPrinter, printAgentUrl]);

  const handleToggle = (checked: boolean) => {
    setShowProductImages(checked);
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 3000);
  };

  const handlePrinterPreferenceSaved = () => {
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 3000);
  };

  const handleModelChange = (modelId: string) => {
    const found = PRINTER_MODEL_PROFILES.find((p) => p.id === modelId);
    if (found) {
      updatePreferences({
        printerModelId: found.id,
        printerName: found.name,
        printerType: found.manufacturer,
        printerLanguage: found.language,
        mediaType: found.defaultMediaType,
        sensorMode: found.defaultSensor
      });
      handlePrinterPreferenceSaved();
    }
  };

  const triggerCalibrate = async () => {
    setActionStatus('Calibrating gap sensor on thermal printer...');
    const res = await sendNativeCalibrate(selectedProfile, printAgentUrl);
    setActionStatus(res.message);
    setTimeout(() => setActionStatus(null), 4000);
  };

  const triggerFeed = async () => {
    setActionStatus('Feeding label roll...');
    const res = await sendNativeFeed(selectedProfile, 1, printAgentUrl);
    setActionStatus(res.message);
    setTimeout(() => setActionStatus(null), 4000);
  };

  const triggerTestPrint = async () => {
    if (agentHealth.connected) {
      setActionStatus('Dispatching native test label...');
      const res = await sendNativeTestPrint(selectedProfile, printAgentUrl);
      setActionStatus(res.message);
      setTimeout(() => setActionStatus(null), 4000);
    } else {
      // High-fidelity physical popup preview fallback
      const sampleBarcode = '890609529642';
      const geometry = calculateLabelGeometry(selectedProfile);
      const typography = calculateLabelTypography(selectedProfile);
      const fit = calculateBarcodeFit(sampleBarcode, selectedProfile);
      const svgStr = generateBarcodeSvg(sampleBarcode, {
        width: fit.moduleWidthPx,
        height: fit.barHeightPx,
        includeText: selectedProfile.showBarcodeValue,
        fontSize: fit.fontSizePx,
        quietZone: fit.quietZoneModules
      });
      const prodFont = calculateTextFit('ADUKALE MADDUR VADE', geometry.textMaxWidthMm, typography.productFontMm);
      const priceFont = calculateTextFit('₹395.00', geometry.textMaxWidthMm, typography.priceFontMm, 2);

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Test Label - ${selectedProfile.name}</title>
            <style>
              @page { size: ${geometry.widthMm}mm ${geometry.heightMm}mm; margin: 0; }
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: system-ui, sans-serif; color: #000; background: #fff; }
              .print-label-card {
                width: ${geometry.widthMm}mm;
                height: ${geometry.heightMm}mm;
                padding: ${selectedProfile.marginTopMm}mm ${selectedProfile.marginRightMm}mm ${selectedProfile.marginBottomMm}mm ${selectedProfile.marginLeftMm}mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: ${typography.rowGapMm}mm;
                text-align: center;
                background: #fff;
                overflow: hidden;
              }
              .label-brand { font-size: ${typography.brandFontMm}mm; font-weight: 700; text-transform: uppercase; color: #444; }
              .label-name { font-size: ${prodFont}mm; line-height: ${typography.productLineHeightMm}mm; font-weight: 700; }
              .label-barcode { width: ${geometry.barcodeMaxWidthMm}mm; max-height: ${geometry.barcodeMaxHeightMm + 4}mm; display: flex; justify-content: center; align-items: center; }
              .label-barcode svg { width: ${fit.displayWidthMm}mm; max-width: 100%; height: auto; }
              .label-footer { width: ${geometry.textMaxWidthMm}mm; display: flex; flex-direction: column; align-items: center; gap: 0.2mm; }
              .label-price { font-size: ${priceFont}mm; font-weight: 800; }
              .label-meta { font-size: ${typography.metaFontMm}mm; line-height: ${typography.metaLineHeightMm}mm; font-weight: 600; color: #444; display: flex; flex-direction: column; align-items: center; }
            </style>
          </head>
          <body onload="window.print();">
            <div class="print-label-card">
              <div class="label-brand">ADUKALE</div>
              <div class="label-name">ADUKALE MADDUR VADE</div>
              <div class="label-barcode">${svgStr}</div>
              <div class="label-footer">
                <div class="label-price">₹395.00</div>
                <div class="label-meta">
                  <div>Lot: LOT-OPENING</div>
                  <div>EXP: 03/12/2026</div>
                </div>
              </div>
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            Display & Client Preferences
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Workstation preferences, thermal printer drivers, and die-cut gap media configuration.
          </p>
        </div>

        {savedBadge && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Preference Saved
          </div>
        )}
      </div>

      {/* 1. Visual Thumbnails */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
              <Image className="w-5 h-5" />
            </div>
            <div>
              <label
                htmlFor="pref-product-images"
                className="text-sm font-semibold text-slate-900 block cursor-pointer select-none"
              >
                Product Image Thumbnails
              </label>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                Display product images in Product Master, Inventory, and POS Terminal grids.
              </p>
            </div>
          </div>

          <div className="flex items-center pt-1">
            <input
              id="pref-product-images"
              type="checkbox"
              checked={showProductImages}
              disabled={!isLoaded}
              onChange={(e) => handleToggle(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 2. Thermal Printer & Die-Cut Media Studio */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Thermal Label Printer & Media</h3>
                <Badge variant="brand" size="sm">
                  {printerLanguage} Dialect
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                Hardware driver, transmissive gap sensor, and physical die-cut media calibration.
              </p>
            </div>
          </div>

          {/* Local Print Agent Status Pill */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                agentHealth.connected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  agentHealth.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{agentHealth.connected ? 'Print Agent: Connected' : 'Print Agent: Offline'}</span>
              <button
                type="button"
                onClick={() => checkAgent()}
                disabled={isCheckingAgent}
                title="Refresh Agent Connection"
                className="p-0.5 hover:opacity-75"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingAgent ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Printer Model & Protocol Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Printer Model</label>
            <Select
              value={printerModelId || 'tvs_lp46_dlite'}
              disabled={!isPrinterLoaded}
              onChange={(e) => handleModelChange(e.target.value)}
              options={PRINTER_MODEL_PROFILES.map((p) => ({
                value: p.id,
                label: p.name
              }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Native Command Dialect</label>
            <Select
              value={printerLanguage}
              disabled={!isPrinterLoaded}
              onChange={(e) => {
                updatePreferences({ printerLanguage: e.target.value as any });
                handlePrinterPreferenceSaved();
              }}
              options={[
                { value: 'TSPL-EZ', label: 'TSPL-EZ (TVS LP-46 Dlite)' },
                { value: 'TSPL', label: 'TSPL (TSC / Standard)' },
                { value: 'ZPL', label: 'ZPL II (Zebra)' },
                { value: 'EPL', label: 'EPL (Eltron)' },
                { value: 'BROWSER', label: 'Browser Engine (Standard HTML)' }
              ]}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Interface & Port</label>
            <Input
              value="USB (Auto-detected)"
              disabled
              className="bg-slate-50 text-slate-600 font-mono text-xs"
            />
          </div>
        </div>

        {/* Media Type & Transmissive Sensor Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-600" />
              Media Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'DIE_CUT', label: 'Die-Cut Labels' },
                { id: 'CONTINUOUS', label: 'Continuous' },
                { id: 'BLACK_MARK', label: 'Black Mark' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    updatePreferences({ mediaType: m.id as any });
                    handlePrinterPreferenceSaved();
                  }}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    mediaType === m.id
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              Sensor Sensing Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'GAP', label: 'Transmissive Gap' },
                { id: 'BLACK_MARK', label: 'Reflective Mark' },
                { id: 'CONTINUOUS', label: 'No Sensor' }
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    updatePreferences({ sensorMode: s.id as any });
                    handlePrinterPreferenceSaved();
                  }}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    sensorMode === s.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold ring-1 ring-indigo-500'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Physical Label Media Presets & Custom Dimensions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">Label Roll Dimensions</label>
            <span className="text-[11px] text-slate-500">
              Active: <strong className="text-slate-900 font-mono">{selectedProfile.widthMm} x {selectedProfile.heightMm} mm</strong> (Gap: {gapMm} mm)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {[...LABEL_PROFILE_PRESETS, customProfile].map((profile) => {
              const isSelected = selectedProfileId === profile.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => {
                    setSelectedProfileId(profile.id);
                    handlePrinterPreferenceSaved();
                  }}
                  className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-950 ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="block text-xs font-bold truncate">{profile.name}</span>
                  <span className="block text-[10px] font-mono text-slate-500">
                    {profile.widthMm} x {profile.heightMm} mm
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Full Manual Dimensions & Offsets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700">Label Width (mm)</label>
            <Input
              type="number"
              min={20}
              max={160}
              value={selectedProfileId === 'custom' ? customProfile.widthMm : selectedProfile.widthMm}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCustomProfile({ ...customProfile, widthMm: val });
                setSelectedProfileId('custom');
                handlePrinterPreferenceSaved();
              }}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700">Label Height (mm)</label>
            <Input
              type="number"
              min={15}
              max={120}
              value={selectedProfileId === 'custom' ? customProfile.heightMm : selectedProfile.heightMm}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCustomProfile({ ...customProfile, heightMm: val });
                setSelectedProfileId('custom');
                handlePrinterPreferenceSaved();
              }}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700">Inter-Label Gap (mm)</label>
            <Input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={gapMm}
              onChange={(e) => {
                updatePreferences({ gapMm: Number(e.target.value) });
                handlePrinterPreferenceSaved();
              }}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700">X Offset (mm)</label>
            <Input
              type="number"
              min={-10}
              max={10}
              step={0.5}
              value={xOffsetMm}
              onChange={(e) => {
                updatePreferences({ xOffsetMm: Number(e.target.value) });
                handlePrinterPreferenceSaved();
              }}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700">Y Offset (mm)</label>
            <Input
              type="number"
              min={-10}
              max={10}
              step={0.5}
              value={yOffsetMm}
              onChange={(e) => {
                updatePreferences({ yOffsetMm: Number(e.target.value) });
                handlePrinterPreferenceSaved();
              }}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700">Resolution (DPI)</label>
            <Select
              value={String(selectedProfile.dpi || 203)}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCustomProfile({ ...customProfile, dpi: val });
                setSelectedProfileId('custom');
                handlePrinterPreferenceSaved();
              }}
              options={[
                { value: '203', label: '203 DPI (8 dots/mm - Standard TVS)' },
                { value: '300', label: '300 DPI (12 dots/mm)' },
                { value: '600', label: '600 DPI (24 dots/mm)' }
              ]}
              className="text-xs"
            />
          </div>
        </div>

        {/* Calibration & Test Print Workflow Box */}
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-700" />
              <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                Printer Gap Calibration & Hardware Diagnostics
              </h4>
            </div>
            {actionStatus && (
              <span className="text-xs font-semibold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 animate-fade-in">
                {actionStatus}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            1. Load the physical die-cut label roll into TVS LP-46 Dlite and close cover.{' '}
            2. Measure physical label width, height, and inter-label gap (e.g. 58x40mm with 2mm gap).{' '}
            3. Press <strong>Calibrate</strong> so the transmissive sensor locks the label gap boundary.{' '}
            4. Press <strong>Feed</strong> to verify 1 single label advances cleanly.{' '}
            5. Run <strong>Test Print</strong> to confirm scan-readiness and alignment.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            <div className="rounded-lg border border-blue-100 bg-white px-2.5 py-2">
              <span className="block text-slate-500">Across printhead</span>
              <strong className="block font-mono text-slate-900">
                {selectedProfile.physicalMedia?.acrossPrintheadMm ?? selectedProfile.widthMm} mm
              </strong>
            </div>
            <div className="rounded-lg border border-blue-100 bg-white px-2.5 py-2">
              <span className="block text-slate-500">Feed direction</span>
              <strong className="block font-mono text-slate-900">
                {selectedProfile.physicalMedia?.alongFeedMm ?? selectedProfile.heightMm} mm
              </strong>
            </div>
            <div className="rounded-lg border border-blue-100 bg-white px-2.5 py-2">
              <span className="block text-slate-500">Gap sensor</span>
              <strong className="block font-mono text-slate-900">{mediaType} / {sensorMode}</strong>
            </div>
            <div className="rounded-lg border border-blue-100 bg-white px-2.5 py-2">
              <span className="block text-slate-500">Barcode rotation</span>
              <strong className="block font-mono text-slate-900">{selectedProfile.barcodeRotation ?? 0}°</strong>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-1 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={triggerCalibrate}
              className="gap-1.5 bg-white text-slate-800 hover:bg-slate-50 border-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              Calibrate Sensor
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={triggerFeed}
              className="gap-1.5 bg-white text-slate-800 hover:bg-slate-50 border-slate-300"
            >
              <Play className="w-3.5 h-3.5 text-indigo-600" />
              Feed 1 Label
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={triggerTestPrint}
              className="gap-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Test Print
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updatePreferences({
                  ...TVS_LP46_DLITE_PROFILE,
                  selectedProfileId: 'label_58x40'
                });
                handlePrinterPreferenceSaved();
              }}
              className="text-xs ml-auto"
            >
              Reset to TVS LP-46 Default
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
