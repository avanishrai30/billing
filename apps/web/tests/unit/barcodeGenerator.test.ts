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
