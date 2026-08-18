import React, { useState } from 'react';
import { Sliders, Image, CheckCircle2 } from 'lucide-react';
import { useVisualPreferences } from '../hooks';

export function PreferenceSettings() {
  const { showProductImages, setShowProductImages, isLoaded } = useVisualPreferences();
  const [savedBadge, setSavedBadge] = useState(false);

  const handleToggle = (checked: boolean) => {
    setShowProductImages(checked);
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
    </div>
  );
}
