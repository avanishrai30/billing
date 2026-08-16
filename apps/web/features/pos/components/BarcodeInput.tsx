'use client';

import React, { useEffect, useRef } from 'react';

export interface BarcodeInputProps {
  onBarcodeScanned: (barcode: string) => void;
  enabled?: boolean;
}

/**
 * Universal Hardware Barcode Scanner Listener.
 * Catches rapid keystroke bursts terminated by Enter from standard USB / BT HID barcode readers.
 */
export function BarcodeInput({ onBarcodeScanned, enabled = true }: BarcodeInputProps) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keystrokes inside text inputs or textareas to avoid hijacking normal typing
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if (isInput) {
        return;
      }

      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Reset buffer if elapsed time between characters is large (> 150ms typical typing vs < 40ms barcode burst)
      if (elapsed > 150) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        if (code.length >= 3) {
          onBarcodeScanned(code);
          bufferRef.current = '';
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onBarcodeScanned]);

  return null;
}
