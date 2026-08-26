import React, { useState } from 'react';
import { Sliders, Image, CheckCircle2, Printer } from 'lucide-react';
import { Input, Select } from '../../../components/ui';
import { usePrinterLabelPreferences, useVisualPreferences } from '../hooks';
import { LABEL_PROFILE_PRESETS } from '../../../lib/utils/labelProfiles';

export function PreferenceSettings() {
  const { showProductImages, setShowProductImages, isLoaded } = useVisualPreferences();
  const {
    selectedProfileId,
    selectedProfile,
    customProfile,
    printerName,
    printerType,
    setSelectedProfileId,
    setCustomProfile,
    setPrinterName,
    setPrinterType,
    isLoaded: isPrinterLoaded
  } = usePrinterLabelPreferences();
  const [savedBadge, setSavedBadge] = useState(false);

  const handleToggle = (checked: boolean) => {
    setShowProductImages(checked);
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 3000);
  };

  const handlePrinterPreferenceSaved = () => {
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 3000);
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
            Customize personal workstation preferences and visual behaviors.
          </p>
        </div>

        {savedBadge && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Preference Saved
          </div>
        )}
      </div>

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
                Display product images in Product Master, Inventory, and POS Terminal grids. When disabled or unavailable, the product code fallback is shown.
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

      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Printers & Labels</h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                Set the default workstation printer media used by Product Master barcode labels.
              </p>
            </div>
          </div>
          <div className="text-[11px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
            {selectedProfile.widthMm} x {selectedProfile.heightMm} mm
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="printer-name" className="text-xs font-semibold text-slate-700">
              Printer Name
            </label>
            <Input
              id="printer-name"
              value={printerName}
              disabled={!isPrinterLoaded}
              onChange={(event) => {
                setPrinterName(event.target.value);
                handlePrinterPreferenceSaved();
              }}
              placeholder="Generic Thermal Printer"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="printer-type" className="text-xs font-semibold text-slate-700">
              Printer Type
            </label>
            <Select
              id="printer-type"
              value={printerType}
              disabled={!isPrinterLoaded}
              onChange={(event) => {
                setPrinterType(event.target.value);
                handlePrinterPreferenceSaved();
              }}
              options={[
                { value: 'Generic Thermal', label: 'Generic Thermal' },
                { value: 'Zebra', label: 'Zebra' },
                { value: 'Xprinter', label: 'Xprinter' },
                { value: 'TSC', label: 'TSC' }
              ]}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Default Label Media</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                  <span className="block text-xs font-bold">{profile.name}</span>
                  <span className="block text-[10px] font-mono text-slate-500">
                    {profile.widthMm} x {profile.heightMm} mm
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedProfileId === 'custom' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-200 pt-4">
            {([
              ['Width (mm)', 'widthMm', 20, 160],
              ['Height (mm)', 'heightMm', 15, 120],
              ['Margin Top (mm)', 'marginTopMm', 0, 20],
              ['Margin Right (mm)', 'marginRightMm', 0, 20],
              ['Margin Bottom (mm)', 'marginBottomMm', 0, 20],
              ['Margin Left (mm)', 'marginLeftMm', 0, 20],
              ['DPI', 'dpi', 152, 600]
            ] as const).map(([label, key, min, max]) => (
              <div key={String(key)} className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">{label}</label>
                <Input
                  type="number"
                  min={Number(min)}
                  max={Number(max)}
                  value={Number(customProfile[key as keyof typeof customProfile]) || ''}
                  onChange={(event) => {
                    setCustomProfile({
                      ...customProfile,
                      [key]: Number(event.target.value)
                    });
                    handlePrinterPreferenceSaved();
                  }}
                  className="text-xs"
                />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">Orientation</label>
              <Select
                value={customProfile.orientation}
                onChange={(event) => {
                  setCustomProfile({
                    ...customProfile,
                    orientation: event.target.value as 'portrait' | 'landscape'
                  });
                  handlePrinterPreferenceSaved();
                }}
                options={[
                  { value: 'portrait', label: 'Portrait' },
                  { value: 'landscape', label: 'Landscape' }
                ]}
                className="text-xs"
              />
            </div>
          </div>
        )}

        {/* Action Controls: Test Print & Live Simulator */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-slate-500">
            Active Media: <strong className="text-slate-800 font-mono">{selectedProfile.widthMm} x {selectedProfile.heightMm} mm</strong> ({selectedProfile.dpi || 203} DPI)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const sampleBarcode = '890609529642';
                const { calculateLabelGeometry, calculateLabelTypography, calculateBarcodeFit, calculateTextFit } = require('../../../lib/utils/labelProfiles');
                const { generateBarcodeSvg } = require('../../../lib/utils/barcode');
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
                            <div>EXP: 2026-12-03</div>
                          </div>
                        </div>
                      </div>
                    </body>
                    </html>
                  `);
                  printWindow.document.close();
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Test Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
