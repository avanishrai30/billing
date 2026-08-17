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
    <div className="bg-[#001845]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            Display & Client Preferences
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Customize personal workstation preferences and visual behaviors.
          </p>
        </div>

        {savedBadge && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Preference Saved
          </div>
        )}
      </div>

      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0 mt-0.5">
              <Image className="w-5 h-5" />
            </div>
            <div>
              <label
                htmlFor="pref-product-images"
                className="text-sm font-bold text-white block cursor-pointer select-none"
              >
                Product Image Thumbnails
              </label>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                Display high-resolution product images in Product Master, Inventory, and POS Terminal grids. When disabled or unavailable, elegant fallbacks and emojis are displayed.
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
              className="w-5 h-5 rounded border-white/20 bg-black/40 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
