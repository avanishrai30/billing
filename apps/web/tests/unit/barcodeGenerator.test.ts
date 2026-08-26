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
  mmToPx,
  pxToMm
} from '../../lib/utils/labelProfiles';

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
      marginBottomMm: 2
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


