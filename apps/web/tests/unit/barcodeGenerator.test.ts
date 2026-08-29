import {
  encodeCode128,
  symbolsToModules,
  generateBarcodeSvg,
  START_CODE_B,
  START_CODE_C,
  CODE_SWITCH_TO_B,
  CODE_SWITCH_TO_C,
  STOP_CODE
} from '../../lib/utils/barcode';
import {
  calculateBarcodeFit,
  calculateLabelGeometry,
  calculateLabelScale,
  calculateLabelTypography,
  calculateTextFit,
  formatDisplayDate,
  formatInputDate,
  LABEL_PROFILE_PRESETS,
  normalizeLabelProfile,
  resolvePrinterModelProfile,
  mmToPx,
  pxToMm
} from '../../lib/utils/labelProfiles';
import { calculatePreviewFit } from '../../lib/utils/previewFit';
import {
  alignElements,
  calculateResize,
  calculateRotation,
  createDefaultLabelDesign,
  deleteElement,
  detectCollisions,
  distributeElements,
  duplicateElement,
  getPrinterSupportedDpis,
  hitTestElement,
  mmToScreen,
  screenToMm,
  validateLabelDesign,
  type LabelDesignElement
} from '../../lib/utils/labelDesign';

describe('Code 128 Auto Barcode Vector Engine (ISO/IEC 15417)', () => {
  it('1. Correctly selects Start B for alphanumeric and short numeric codes', () => {
    const symbols = encodeCode128('AIA001');
    expect(symbols[0]).toBe(START_CODE_B);
    expect(symbols[symbols.length - 1]).toBe(STOP_CODE);
  });

  it('2. Correctly selects Start C for barcodes starting with 4+ numeric digits', () => {
    // EAN/GTIN standard 13 digits
    const symbols = encodeCode128('8901234567890');
    expect(symbols[0]).toBe(START_CODE_C);
    // Encodes pairs: 89, 01, 23, 45, 67, 89, then switches to B for final single digit 0
    expect(symbols[1]).toBe(89);
    expect(symbols[2]).toBe(1);
    expect(symbols[3]).toBe(23);
    expect(symbols[4]).toBe(45);
    expect(symbols[5]).toBe(67);
    expect(symbols[6]).toBe(89);
    expect(symbols[7]).toBe(CODE_SWITCH_TO_B);
    expect(symbols[symbols.length - 1]).toBe(STOP_CODE);
  });

  it('3. Computes exact Modulo 103 checksum and valid module count', () => {
    const symbols = encodeCode128('AIA000042');
    // Start B = 104, 'A'=33, 'I'=41, 'A'=33, switch to C = 99, 00=0, 42=42
    const modules = symbolsToModules(symbols);

    // Each symbol is 11 modules, stop symbol is 13 modules
    const expectedModules = (symbols.length - 1) * 11 + 13;
    expect(modules.length).toBe(expectedModules);
    expect(modules.every(m => m === 0 || m === 1)).toBe(true);
  });

  it('4. Generates crisp, compliant SVG markup with quiet zones and human-readable text', () => {
    const svg = generateBarcodeSvg('AIA000042', {
      width: 1.5,
      height: 40,
      includeText: true,
      quietZone: 10
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('<rect');
    expect(svg).toContain('<text');
    expect(svg).toContain('AIA000042');
    expect(svg).toContain('</svg>');
  });

  it('5. Handles empty and whitespace barcode strings safely without throwing', () => {
    expect(generateBarcodeSvg('')).toBe('');
    expect(generateBarcodeSvg('   ')).toBe('');
  });
});

describe('Printer Profile Label Geometry', () => {
  it('contains physical preview canvas inside available viewport without distortion', () => {
    const fit = calculatePreviewFit({
      labelWidthPx: 384,
      labelHeightPx: 144,
      availableWidthPx: 320,
      availableHeightPx: 240,
      paddingPx: 16
    });

    expect(fit.widthPx).toBeLessThanOrEqual(320);
    expect(fit.heightPx).toBeLessThanOrEqual(240);
    expect(fit.widthPx / fit.heightPx).toBeCloseTo(384 / 144, 5);
    expect(fit.offsetX).toBeGreaterThanOrEqual(0);
    expect(fit.offsetY).toBeGreaterThanOrEqual(0);
  });

  it('contains extreme portrait and landscape labels using one uniform scale', () => {
    const cases = [
      [120, 30],
      [30, 120],
      [160, 40],
      [40, 120]
    ] as const;

    for (const [width, height] of cases) {
      const fit = calculatePreviewFit({
        labelWidthPx: mmToPx(width, 96),
        labelHeightPx: mmToPx(height, 96),
        availableWidthPx: 460,
        availableHeightPx: 340,
        paddingPx: 20
      });

      expect(fit.widthPx).toBeLessThanOrEqual(460);
      expect(fit.heightPx).toBeLessThanOrEqual(340);
      expect(fit.widthPx / fit.heightPx).toBeCloseTo(width / height, 5);
    }
  });

  it('calculates printable geometry from physical millimeter media', () => {
    const profile = LABEL_PROFILE_PRESETS.find((preset) => preset.id === 'label_58x40')!;
    const geometry = calculateLabelGeometry(profile);

    expect(geometry.widthMm).toBe(58);
    expect(geometry.heightMm).toBe(40);
    expect(geometry.printableWidthMm).toBe(53);
    expect(geometry.printableHeightMm).toBe(35);
    expect(geometry.barcodeMaxWidthMm).toBeLessThanOrEqual(geometry.contentWidthMm);
  });

  it('supports every required standard preset and custom-sized geometry', () => {
    const ids = LABEL_PROFILE_PRESETS.map((preset) => preset.id);

    expect(ids).toEqual([
      'label_58x30',
      'label_58x40',
      'label_60x40',
      'label_70x40',
      'label_80x50',
      'label_100x50'
    ]);

    const custom = calculateLabelGeometry({
      ...LABEL_PROFILE_PRESETS[1],
      id: 'custom',
      name: 'Custom',
      widthMm: 72,
      heightMm: 38,
      marginLeftMm: 3,
      marginRightMm: 3,
      marginTopMm: 2,
      marginBottomMm: 2,
      physicalMedia: {
        acrossPrintheadMm: 72,
        alongFeedMm: 38,
        gapMm: 2
      }
    });

    expect(custom.widthMm).toBe(72);
    expect(custom.heightMm).toBe(38);
    expect(custom.printableWidthMm).toBe(66);
  });

  it('converts millimeters and pixels using the selected printer DPI', () => {
    const px = mmToPx(25.4, 203);

    expect(px).toBeCloseTo(203, 5);
    expect(pxToMm(px, 203)).toBeCloseTo(25.4, 5);
  });

  it('calculates scan-safe barcode fit and warns when module width is too small', () => {
    const safeFit = calculateBarcodeFit('890609529642', LABEL_PROFILE_PRESETS[1]);
    const unsafeFit = calculateBarcodeFit('AIA-VERY-LONG-BARCODE-VALUE-THAT-CANNOT-FIT', {
      ...LABEL_PROFILE_PRESETS[0],
      widthMm: 25,
      heightMm: 15,
      marginLeftMm: 2,
      marginRightMm: 2
    });

    expect(safeFit.safe).toBe(true);
    expect(safeFit.moduleWidthPx).toBeGreaterThan(0);
    expect(unsafeFit.safe).toBe(false);
    expect(unsafeFit.warnings[0]).toContain('Barcode cannot safely fit');
  });

  it('fits long product names and keeps screen preview proportional', () => {
    const profile = LABEL_PROFILE_PRESETS[0];
    const geometry = calculateLabelGeometry(profile);
    const type = calculateLabelTypography(profile);
    const fittedFont = calculateTextFit(
      'Extra Long Organic Product Name With Multiple Descriptors 500ml',
      geometry.textMaxWidthMm,
      type.productFontMm
    );
    const scale = calculateLabelScale(profile, 300, 220);

    expect(fittedFont).toBeLessThanOrEqual(type.productFontMm);
    expect(fittedFont).toBeGreaterThanOrEqual(1.45);
    expect(scale).toBeGreaterThan(0);
  });

  it('preserves aspect ratio without distortion across all 6 presets', () => {
    const presets = LABEL_PROFILE_PRESETS;
    for (const preset of presets) {
      const fit = calculateBarcodeFit('890609529642', preset);
      const geometry = calculateLabelGeometry(preset);

      expect(fit.displayWidthMm).toBeLessThanOrEqual(geometry.printableWidthMm);
      expect(fit.displayHeightMm).toBeLessThanOrEqual(geometry.printableHeightMm);
      expect(fit.safe).toBe(true);
      expect(fit.barHeightPx).toBeGreaterThan(0);
    }
  });

  it('handles short barcodes gracefully without exceeding max module width', () => {
    const fitShort = calculateBarcodeFit('1234', LABEL_PROFILE_PRESETS[1]);
    const fitStandard = calculateBarcodeFit('890609529642', LABEL_PROFILE_PRESETS[1]);

    expect(fitShort.safe).toBe(true);
    expect(fitShort.moduleWidthPx).toBeLessThanOrEqual(mmToPx(0.66, 203));
    expect(fitShort.displayWidthMm).toBeLessThanOrEqual(fitStandard.displayWidthMm);
  });

  it('calculates landscape orientation geometry correctly', () => {
    const landscapeProfile = {
      ...LABEL_PROFILE_PRESETS[1],
      orientation: 'landscape' as const
    };
    const geometry = calculateLabelGeometry(landscapeProfile);

    expect(geometry.widthMm).toBeGreaterThanOrEqual(geometry.heightMm);
    expect(geometry.widthMm).toBe(58);
    expect(geometry.heightMm).toBe(40);
  });

  it('keeps label orientation separate from barcode rotation for horizontal TVS labels', () => {
    const profile = {
      ...LABEL_PROFILE_PRESETS[0],
      widthMm: 58,
      heightMm: 30,
      physicalMedia: {
        acrossPrintheadMm: 58,
        alongFeedMm: 30,
        gapMm: 2
      },
      orientation: 'landscape' as const,
      barcodeRotation: 0 as const
    };
    const geometry = calculateLabelGeometry(profile);
    const { buildProductLabelDocument } = require('../../lib/utils/labelDocument');
    const doc = buildProductLabelDocument({
      product: {
        id: 'prd-1',
        name: 'ADUKALE MADDUR VADE',
        sku: 'ADU-MV',
        barcode: '890609529642',
        sellingPrice: 395
      },
      profile
    });
    const barcode = doc.elements.find((element: any) => element.type === 'barcode');

    expect(geometry.widthMm).toBe(58);
    expect(geometry.heightMm).toBe(30);
    expect(doc.orientation).toBe(0);
    expect(barcode.rotation).toBe(0);
  });

  it('resolves TVS LP-46 Dlite from normalized detected printer metadata', () => {
    expect(resolvePrinterModelProfile({
      name: 'TVS Electronics LP-46 Dlite USB',
      languages: ['TSPL-EZ']
    })?.id).toBe('tvs_lp46_dlite');
    expect(resolvePrinterModelProfile({
      manufacturer: 'TVS',
      model: 'LP46 D-Lite',
      dpi: 203
    })?.id).toBe('tvs_lp46_dlite');
  });
});

describe('Barcode Studio Physical Label Design Editor', () => {
  const product = {
    id: 'prd-editor',
    name: 'A2 Cow Cultured Ghee 500ml',
    sku: 'GHEE-A2-500',
    barcode: '8901234567890',
    brand: 'VC ORGANIC',
    sellingPrice: 650,
    purchasePrice: 500,
    sellingMode: 'packaged' as const
  };

  it('converts screen pixels to physical millimeters and back independent of DPI', () => {
    const transform = { scale: 1.75, originXPx: 12, originYPx: 8, pxPerMm: 96 / 25.4 };
    const mm = screenToMm({ x: 78.14, y: 41.07 }, transform);
    const screen = mmToScreen(mm, transform);

    expect(mm.x).toBeCloseTo(10, 1);
    expect(mm.y).toBeCloseTo(5, 1);
    expect(screen.x).toBeCloseTo(78.14, 1);
    expect(screen.y).toBeCloseTo(41.07, 1);
  });

  it('creates canonical label designs for 203, 300 and 600 DPI without storing pixels', () => {
    for (const dpi of [203, 300, 600]) {
      const design = createDefaultLabelDesign({
        product,
        profile: { ...LABEL_PROFILE_PRESETS[1], dpi }
      });

      expect(design.dpi).toBe(dpi);
      expect(design.elements.every((element) => Number.isFinite(element.xMm) && Number.isFinite(element.widthMm))).toBe(true);
      expect(JSON.stringify(design)).not.toContain('Px');
    }
  });

  it('supports horizontal, vertical and extreme aspect ratio layouts inside bounds', () => {
    const cases = [
      { ...LABEL_PROFILE_PRESETS[0], widthMm: 58, heightMm: 30, orientation: 0 as const },
      { ...LABEL_PROFILE_PRESETS[1], widthMm: 40, heightMm: 58, orientation: 90 as const },
      { ...LABEL_PROFILE_PRESETS[1], widthMm: 120, heightMm: 25, orientation: 0 as const },
      { ...LABEL_PROFILE_PRESETS[1], widthMm: 25, heightMm: 120, orientation: 90 as const }
    ];

    for (const profile of cases) {
      const design = createDefaultLabelDesign({ product, profile });
      expect(validateLabelDesign(design, profile)).toEqual([]);
    }
  });

  it('hit-tests visible elements and ignores empty space', () => {
    const design = createDefaultLabelDesign({ product, profile: LABEL_PROFILE_PRESETS[1] });
    const productElement = design.elements.find((element) => element.id === 'product')!;

    expect(hitTestElement({ x: productElement.xMm + 1, y: productElement.yMm + 1 }, design.elements)?.id).toBe('product');
    expect(hitTestElement({ x: 500, y: 500 }, design.elements)).toBeNull();
  });

  it('resizes barcode with aspect preservation by default and allows unlock', () => {
    const design = createDefaultLabelDesign({ product, profile: LABEL_PROFILE_PRESETS[1] });
    const barcode = design.elements.find((element) => element.id === 'barcode')!;
    const locked = calculateResize({
      element: barcode,
      handle: 'se',
      deltaMm: { x: 8, y: 1 },
      labelWidthMm: 58,
      labelHeightMm: 40,
      preserveAspectRatio: true,
      snapEnabled: false
    });
    const unlocked = calculateResize({
      element: { ...barcode, lockAspectRatio: false },
      handle: 'se',
      deltaMm: { x: 8, y: 1 },
      labelWidthMm: 58,
      labelHeightMm: 40,
      preserveAspectRatio: false,
      snapEnabled: false
    });

    expect(locked.widthMm / locked.heightMm).toBeCloseTo(barcode.widthMm / barcode.heightMm, 1);
    expect(unlocked.widthMm / unlocked.heightMm).not.toBeCloseTo(barcode.widthMm / barcode.heightMm, 1);
  });

  it('snaps resize values to millimeter grid and calculates rotation', () => {
    const element: LabelDesignElement = {
      id: 'product',
      type: 'product',
      xMm: 2.2,
      yMm: 3.2,
      widthMm: 20.2,
      heightMm: 5.2,
      rotation: 0
    };
    const resized = calculateResize({
      element,
      handle: 'se',
      deltaMm: { x: 2.4, y: 2.4 },
      labelWidthMm: 58,
      labelHeightMm: 40,
      snapEnabled: true
    });

    expect(resized.widthMm).toBe(23);
    expect(resized.heightMm).toBe(8);
    expect(calculateRotation({ center: { x: 10, y: 10 }, pointer: { x: 20, y: 10 }, snapDegrees: 45 })).toBe(90);
  });

  it('aligns, distributes, detects collisions and validates bounds', () => {
    const elements: LabelDesignElement[] = [
      { id: 'brand', type: 'brand', xMm: 2, yMm: 2, widthMm: 10, heightMm: 5, rotation: 0 },
      { id: 'product', type: 'product', xMm: 4, yMm: 4, widthMm: 10, heightMm: 5, rotation: 0 },
      { id: 'price', type: 'price', xMm: 20, yMm: 12, widthMm: 10, heightMm: 5, rotation: 0 }
    ];

    expect(detectCollisions(elements)).toEqual([['brand', 'product']]);
    expect(alignElements(elements, ['brand', 'product'], 'left').map((element) => element.xMm).slice(0, 2)).toEqual([2, 2]);
    expect(distributeElements(elements, ['brand', 'product', 'price'], 'horizontal')[1].xMm).toBeGreaterThan(2);
  });
});

describe('Canonical Label Expiry Date Formatter', () => {
  it('formats canonical ISO date timestamps into DD/MM/YYYY without timezone shift', () => {
    expect(formatDisplayDate('2027-08-25T00:00:00.000Z')).toBe('25/08/2027');
    expect(formatDisplayDate('2027-08-25')).toBe('25/08/2027');
    expect(formatDisplayDate('2026-12-03T23:59:59.999Z')).toBe('03/12/2026');
  });

  it('handles null, undefined, empty strings and already-formatted dates safely', () => {
    expect(formatDisplayDate(null)).toBe('');
    expect(formatDisplayDate(undefined)).toBe('');
    expect(formatDisplayDate('')).toBe('');
    expect(formatDisplayDate('   ')).toBe('');
    expect(formatDisplayDate('25-08-2027')).toBe('25/08/2027');
    expect(formatDisplayDate('25/08/2027')).toBe('25/08/2027');
  });

  it('preserves invalid date strings as safe fallback', () => {
    expect(formatDisplayDate('not-a-date')).toBe('not-a-date');
  });

  it('formats input values for HTML date controls in YYYY-MM-DD format', () => {
    expect(formatInputDate('2027-08-25T00:00:00.000Z')).toBe('2027-08-25');
    expect(formatInputDate('2027-08-25')).toBe('2027-08-25');
    expect(formatInputDate(null)).toBe('');
    expect(formatInputDate(undefined)).toBe('');
  });
});

describe('Universal Thermal Printing Engine & Printer Adapters', () => {
  const {
    calculateBarcodeElementRenderMetrics,
    mmToDots,
    dotsToMm,
    buildProductLabelDocument,
    renderBrowserPrintDocumentHtml,
    validateDocumentBounds
  } = require('../../lib/utils/labelDocument');
  const {
    TSPLAdapter,
    ZPLAdapter,
    EPLAdapter,
    getPrinterAdapterForProfile
  } = require('../../lib/utils/printerAdapters');
  const {
    TVS_LP46_DLITE_PROFILE
  } = require('../../lib/utils/labelProfiles');

  it('1. Accurately converts mm to dots and dots to mm across 203, 300, and 600 DPI', () => {
    // 203 DPI (8 dots/mm)
    expect(mmToDots(25.4, 203)).toBe(203);
    expect(mmToDots(58, 203)).toBe(464);
    expect(mmToDots(40, 203)).toBe(320);
    expect(mmToDots(2, 203)).toBe(16);
    expect(dotsToMm(203, 203)).toBeCloseTo(25.4, 1);

    // 300 DPI (11.8 dots/mm)
    expect(mmToDots(25.4, 300)).toBe(300);
    expect(mmToDots(58, 300)).toBe(685);

    // 600 DPI (23.6 dots/mm)
    expect(mmToDots(25.4, 600)).toBe(600);
  });

  it('2. Canonical TVS LP-46 Dlite profile has correct defaults (203 DPI, TSPL-EZ, DIE_CUT, GAP)', () => {
    expect(TVS_LP46_DLITE_PROFILE.manufacturer).toBe('TVS Electronics');
    expect(TVS_LP46_DLITE_PROFILE.model).toBe('LP-46 Dlite');
    expect(TVS_LP46_DLITE_PROFILE.dpi).toBe(203);
    expect(TVS_LP46_DLITE_PROFILE.printerLanguage).toBe('TSPL-EZ');
    expect(TVS_LP46_DLITE_PROFILE.mediaType).toBe('DIE_CUT');
    expect(TVS_LP46_DLITE_PROFILE.sensorMode).toBe('GAP');
    expect(TVS_LP46_DLITE_PROFILE.gapMm).toBe(2);
  });

  it('3. TSPLAdapter selects TVS LP-46 Dlite and generates valid TSPL command stream', () => {
    const tsplAdapter = new TSPLAdapter();
    expect(tsplAdapter.canHandle(TVS_LP46_DLITE_PROFILE)).toBe(true);

    const doc = buildProductLabelDocument({
      product: {
        id: 'prd-1',
        name: 'A2 Cow Cultured Ghee 500ml',
        sku: 'GHEE-A2-500',
        barcode: '8901234567890',
        brand: 'VC ORGANIC',
        sellingPrice: 650
      },
      profile: TVS_LP46_DLITE_PROFILE,
      effectiveExpiry: '25/08/2027',
      showPrice: true,
      showBrand: true,
      showLotExpiry: true
    });

    const output = tsplAdapter.render(doc, TVS_LP46_DLITE_PROFILE, 2);

    expect(output).toContain('SIZE 58.0 mm, 40.0 mm');
    expect(output).toContain('GAP 2.0 mm, 0 mm');
    expect(output).toContain('DIRECTION 1');
    expect(output).toContain('CLS');
    expect(output).toContain('BARCODE');
    expect(output).toContain('8901234567890');
    expect(output).toContain('VC ORGANIC');
    expect(output).toContain('A2 Cow Cultured Ghee 500ml');
    expect(output).toContain('EXP: 25/08/2027');
    expect(output).toContain('PRINT 2,1');
  });

  it('4. TSPLAdapter generates valid calibration, feed and diagnostic test labels', () => {
    const tsplAdapter = new TSPLAdapter();

    const cal = tsplAdapter.renderCalibration(TVS_LP46_DLITE_PROFILE);
    expect(cal).toContain('GAP 2.0 mm, 0 mm');
    expect(cal).toContain('GAPDETECT');
    expect(cal).toContain('HOME');

    const feed = tsplAdapter.renderFeed(TVS_LP46_DLITE_PROFILE, 1);
    expect(feed).toBe('FEED 1\r\n');

    const testLabel = tsplAdapter.renderTestLabel(TVS_LP46_DLITE_PROFILE);
    expect(testLabel).toContain('TVS LP-46 Dlite (203 DPI)');
    expect(testLabel).toContain('AIA000002');
    expect(testLabel).toContain('BOX');
  });

  it('5. ZPLAdapter generates valid ZPL II commands for Zebra profiles', () => {
    const zplAdapter = new ZPLAdapter();
    const zebraProfile = {
      ...TVS_LP46_DLITE_PROFILE,
      id: 'zebra_test',
      printerLanguage: 'ZPL' as const
    };

    expect(zplAdapter.canHandle(zebraProfile)).toBe(true);

    const doc = buildProductLabelDocument({
      product: {
        id: 'prd-1',
        name: 'Artisan Salt',
        sku: 'SALT-01',
        barcode: '8901234567890',
        sellingPrice: 70
      },
      profile: zebraProfile
    });

    const output = zplAdapter.render(doc, zebraProfile, 1);
    expect(output).toContain('^XA');
    expect(output).toContain('^PW464');
    expect(output).toContain('^LL320');
    expect(output).toContain('^MNY'); // Transmissive gap
    expect(output).toContain('^FD8901234567890^FS');
    expect(output).toContain('^PQ1');
    expect(output).toContain('^XZ');
  });

  it('6. EPLAdapter generates valid EPL commands', () => {
    const eplAdapter = new EPLAdapter();
    const eplProfile = {
      ...TVS_LP46_DLITE_PROFILE,
      id: 'epl_test',
      printerLanguage: 'EPL' as const
    };

    expect(eplAdapter.canHandle(eplProfile)).toBe(true);

    const doc = buildProductLabelDocument({
      product: {
        id: 'prd-1',
        name: 'Artisan Salt',
        sku: 'SALT-01',
        barcode: '8901234567890',
        sellingPrice: 70
      },
      profile: eplProfile
    });

    const output = eplAdapter.render(doc, eplProfile, 1);
    expect(output).toContain('N');
    expect(output).toContain('q464');
    expect(output).toContain('Q320,16');
    expect(output).toContain('P1');
  });

  it('7. Validates document bounding box boundaries preventing out-of-bounds overflow', () => {
    const geometry = calculateLabelGeometry(TVS_LP46_DLITE_PROFILE);
    const validDoc = buildProductLabelDocument({
      product: {
        id: 'prd-1',
        name: 'Normal Product Name',
        sku: 'SKU-001',
        barcode: '8901234567890',
        sellingPrice: 100
      },
      profile: TVS_LP46_DLITE_PROFILE
    });

    const validation = validateDocumentBounds(validDoc, geometry);
    expect(validation.valid).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });

  it('8. Print agent health uses /printers discovery without fake TVS fallback', async () => {
    const { checkPrintAgentHealth } = require('../../lib/utils/printAgent');
    const fetchMock = jest.spyOn(global, 'fetch' as any).mockImplementation((...args: unknown[]) => {
      const url = String(args[0]);
      if (url.endsWith('/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: '1.2.3', printers: ['TVS LP-46 Dlite (stale health payload)'] })
        });
      }
      if (url.endsWith('/printers')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ printers: [] })
        });
      }
      return Promise.reject(new Error('unexpected URL'));
    });

    const health = await checkPrintAgentHealth('http://127.0.0.1:9123');

    expect(health.connected).toBe(true);
    expect(health.printers).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/printers'), expect.any(Object));
    fetchMock.mockRestore();
  });

  it('9. Native print job targets the detected printer name, not the label preset name', async () => {
    const { sendNativePrintJob } = require('../../lib/utils/printAgent');
    const doc = buildProductLabelDocument({
      product: {
        id: 'prd-1',
        name: 'A2 Cow Cultured Ghee 500ml',
        sku: 'GHEE-A2-500',
        barcode: '8901234567890',
        sellingPrice: 650,
        purchasePrice: 450
      },
      profile: TVS_LP46_DLITE_PROFILE
    });
    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jobId: 'job-1', message: 'ok' })
    });

    await sendNativePrintJob(
      {
        printerProfileId: TVS_LP46_DLITE_PROFILE.id,
        printerName: 'TVS Electronics LP-46 Dlite USB',
        mediaProfile: {
          widthMm: 58,
          heightMm: 40,
          gapMm: 2,
          sensorMode: 'GAP'
        },
        copies: 1,
        document: doc
      },
      TVS_LP46_DLITE_PROFILE,
      'http://127.0.0.1:9123'
    );

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.printerName).toBe('TVS Electronics LP-46 Dlite USB');
    expect(body.printerName).not.toBe(TVS_LP46_DLITE_PROFILE.name);
    fetchMock.mockRestore();
  });

  it('10. Canonical design owns barcode human text without a default duplicate barcodeValue element', () => {
    const design = createDefaultLabelDesign({
      profile: TVS_LP46_DLITE_PROFILE,
      product: {
        id: 'prd-1',
        name: 'A2 Ghee',
        sku: 'GHEE-1',
        barcode: '8906095290642',
        sellingPrice: 500,
        purchasePrice: 350
      },
      selectedBatch: null,
      effectiveExpiry: '25/08/2026',
      showPrice: true,
      showBrand: true,
      showLotExpiry: true
    });

    expect(design.elements.some((element) => element.type === 'barcodeValue')).toBe(false);

    const doc = buildProductLabelDocument({
      product: {
        id: 'prd-1',
        name: 'A2 Ghee',
        sku: 'GHEE-1',
        barcode: '8906095290642',
        sellingPrice: 500,
        purchasePrice: 350
      },
      profile: TVS_LP46_DLITE_PROFILE,
      design
    });

    const barcodeElements = doc.elements.filter((element: any) => element.type === 'barcode');
    expect(barcodeElements).toHaveLength(1);
    expect(barcodeElements[0].showHumanReadableText).toBe(true);

    const html = renderBrowserPrintDocumentHtml({
      doc,
      copies: 1,
      title: 'test'
    });
    expect((html.match(/8906095290642/g) || [])).toHaveLength(1);
  });

  it('11. Browser and TSPL print use edited physical barcode geometry exactly', () => {
    const product = {
      id: 'prd-1',
      name: 'A2 Ghee',
      sku: 'GHEE-1',
      barcode: '8906095290642',
      sellingPrice: 500,
      purchasePrice: 350
    };
    const design = createDefaultLabelDesign({
      profile: TVS_LP46_DLITE_PROFILE,
      product,
      selectedBatch: null,
      effectiveExpiry: '25/08/2026',
      showPrice: true,
      showBrand: true,
      showLotExpiry: true
    });

    const barcode = design.elements.find((element) => element.type === 'barcode')!;
    const editedDesign = {
      ...design,
      elements: design.elements.map((element) => element.id === barcode.id
        ? {
            ...element,
            xMm: 15,
            yMm: 12,
            widthMm: 34,
            heightMm: 13,
            rotation: 90,
            showBarcodeText: false
          }
        : element
      )
    };

    const doc = buildProductLabelDocument({
      product,
      profile: TVS_LP46_DLITE_PROFILE,
      design: editedDesign
    });
    const printBarcode = doc.elements.find((element: any) => element.type === 'barcode');
    expect(printBarcode).toMatchObject({
      xMm: 15,
      yMm: 12,
      widthMm: 34,
      heightMm: 13,
      rotation: 90,
      showHumanReadableText: false
    });

    const html = renderBrowserPrintDocumentHtml({ doc, copies: 2, title: 'test' });
    expect(html).toContain('@page');
    expect(html).toContain('size: 58mm 40mm');
    expect(html).toContain('left:15mm;top:12mm;width:34mm;height:13mm;transform:rotate(90deg)');
    expect((html.match(/print-label-card/g) || [])).toHaveLength(4);

    const tspl = new TSPLAdapter().render(doc, TVS_LP46_DLITE_PROFILE, 2);
    expect(tspl).toContain(`BARCODE ${mmToDots(15, 203)},${mmToDots(12, 203)}`);
    expect(tspl).toContain(`,${calculateBarcodeElementRenderMetrics(printBarcode, 203).barHeightDots},0,90,`);
    expect(tspl).toContain('PRINT 2,1');
  });

  it('12. Legacy standalone barcode text disables barcode-internal text to prevent double human-readable output', () => {
    const product = {
      id: 'prd-1',
      name: 'A2 Ghee',
      sku: 'GHEE-1',
      barcode: '8906095290642',
      sellingPrice: 500,
      purchasePrice: 350
    };
    const design = createDefaultLabelDesign({
      profile: TVS_LP46_DLITE_PROFILE,
      product,
      selectedBatch: null,
      effectiveExpiry: '25/08/2026',
      showPrice: true,
      showBrand: true,
      showLotExpiry: true
    });
    const legacyDesign = {
      ...design,
      elements: [
        ...design.elements,
        {
          id: 'barcodeValue',
          type: 'barcodeValue' as const,
          xMm: 2.5,
          yMm: 25,
          widthMm: 53,
          heightMm: 3,
          fontSizeMm: 2,
          fontWeight: 'semibold' as const,
          alignment: 'center' as const,
          lineHeightMm: 2.3,
          letterSpacingMm: 0,
          rotation: 0,
          visible: true
        }
      ]
    };

    const doc = buildProductLabelDocument({
      product,
      profile: TVS_LP46_DLITE_PROFILE,
      design: legacyDesign
    });
    const barcode = doc.elements.find((element: any) => element.type === 'barcode');
    const textCopies = doc.elements.filter((element: any) =>
      element.type === 'text' && element.value === '8906095290642'
    );

    expect(barcode.showHumanReadableText).toBe(false);
    expect(textCopies).toHaveLength(1);
  });

  it('13. Custom label normalization keeps physical media synced with custom dimensions', () => {
    const custom = normalizeLabelProfile({
      ...TVS_LP46_DLITE_PROFILE,
      id: 'custom',
      name: 'Custom',
      widthMm: 80,
      heightMm: 35,
      physicalMedia: {
        acrossPrintheadMm: 80,
        alongFeedMm: 35,
        gapMm: 2
      }
    });
    const geometry = calculateLabelGeometry(custom);

    expect(custom.physicalMedia?.acrossPrintheadMm).toBe(80);
    expect(custom.physicalMedia?.alongFeedMm).toBe(35);
    expect(geometry.widthMm).toBe(80);
    expect(geometry.heightMm).toBe(35);
  });

  it('14. deleteElement removes element by ID and returns new design', () => {
    const design = createDefaultLabelDesign({
      profile: TVS_LP46_DLITE_PROFILE,
      product: {
        id: 'prd-1',
        name: 'A2 Ghee',
        sku: 'GHEE-1',
        barcode: '8901234567890',
        sellingPrice: 500,
        purchasePrice: 350
      },
      selectedBatch: null,
      effectiveExpiry: '25/08/2026',
      showPrice: true,
      showBrand: true,
      showLotExpiry: true
    });

    const initialCount = design.elements.length;
    const priceEl = design.elements.find(e => e.type === 'price');
    expect(priceEl).toBeDefined();

    const updated = deleteElement(design, priceEl!.id);
    expect(updated.elements.length).toBe(initialCount - 1);
    expect(updated.elements.find(e => e.id === priceEl!.id)).toBeUndefined();
  });

  it('15. duplicateElement clones element with offset and returns new element ID', () => {
    const design = createDefaultLabelDesign({
      profile: TVS_LP46_DLITE_PROFILE,
      product: {
        id: 'prd-1',
        name: 'A2 Ghee',
        sku: 'GHEE-1',
        barcode: '8901234567890',
        sellingPrice: 500,
        purchasePrice: 350
      },
      selectedBatch: null,
      effectiveExpiry: '25/08/2026',
      showPrice: true,
      showBrand: true,
      showLotExpiry: true
    });

    const productEl = design.elements.find(e => e.type === 'product');
    expect(productEl).toBeDefined();

    const result = duplicateElement(design, productEl!.id, 58, 40);
    expect(result.newElementId).toBeDefined();
    expect(result.design.elements.length).toBe(design.elements.length + 1);

    const clone = result.design.elements.find(e => e.id === result.newElementId);
    expect(clone).toBeDefined();
    expect(clone!.type).toBe('product');
    expect(clone!.xMm).toBe(Math.min(58 - clone!.widthMm, productEl!.xMm + 2));
    expect(clone!.yMm).toBe(Math.min(40 - clone!.heightMm, productEl!.yMm + 2));
  });

  it('16. getPrinterSupportedDpis returns only [203] for TVS LP-46 Dlite and all standard DPIs for custom/generic', () => {
    const tvsDpis = getPrinterSupportedDpis(TVS_LP46_DLITE_PROFILE);
    expect(tvsDpis).toEqual([203]);

    const genericProfile = {
      ...TVS_LP46_DLITE_PROFILE,
      id: 'generic_thermal',
      name: 'Generic 300DPI Thermal',
      dpi: 300,
      supportedDpis: [203, 300]
    };
    const genericDpis = getPrinterSupportedDpis(genericProfile);
    expect(genericDpis).toEqual([203, 300]);
  });
});
