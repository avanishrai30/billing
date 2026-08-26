# Advanced Barcode Printer Forensics

## Failure

The barcode label UI could show a generic or assumed printer state while rendering labels from screen-card sizing. In practice this made label output dependent on browser scaling, and it blurred three separate facts:

- whether the local Print Agent is online
- whether a real printer was discovered through the local workstation
- how label dimensions map to printhead width, feed direction, gap, and barcode rotation

## Root Cause

The browser print fallback and native thermal path did not have the same truth model for printer discovery. The local agent health check also treated missing printer data as if a TVS LP-46 Dlite was present. Separately, label orientation and barcode rotation were coupled, which could turn a horizontal 58 x 30 mm die-cut label into a misleading 90-degree rotation assumption.

## Fix

- Added explicit `/printers` discovery in the Print Agent client.
- Removed fake TVS printer fallback from `/health`.
- Added normalized TVS LP-46 Dlite model resolution from manufacturer, model, name, id, and language metadata.
- Added `PhysicalMedia` to distinguish across-printhead width, feed-direction height, and gap.
- Added `barcodeRotation` separately from label orientation.
- Gated native print on agent connectivity plus discovered printer availability.
- Kept browser print as an honest fallback with physical `@page` dimensions.
- Updated Product barcode print UI to show printer status, media, DPI, feed direction, gap, and rotation.
- Reworked the selected batch summary into a non-colliding grid.

## Validation

- TypeScript: pass
- Barcode/printer unit tests: pass
- Web Jest suite: pass
- Product barcode Playwright: pass
- Production build: pass

## Note

This repository contains a frontend Print Agent client and native TSPL/ZPL/EPL command adapters. It does not contain the workstation daemon/installer itself. Native USB printing still requires the VC Organic Print Agent or compatible local agent to be running on the machine physically connected to the printer.

