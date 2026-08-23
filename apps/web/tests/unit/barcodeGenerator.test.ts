import { encodeCode128, symbolsToModules, generateBarcodeSvg } from '../../lib/utils/barcode';

describe('Code 128 Barcode Generator Utility Suite', () => {
  it('1. Encodes standard ASCII string with Start Code B, Check Digit, and Stop Code', () => {
    const text = 'AIA000001';
    const symbols = encodeCode128(text);

    // Start symbol is 104 (Start B)
    expect(symbols[0]).toBe(104);

    // Last symbol is 106 (Stop)
    expect(symbols[symbols.length - 1]).toBe(106);

    // Total length = 1 (start) + 9 (chars) + 1 (check) + 1 (stop) = 12 symbols
    expect(symbols.length).toBe(12);
  });

  it('2. Produces valid binary module patterns for bars and spaces', () => {
    const symbols = encodeCode128('TEST');
    const modules = symbolsToModules(symbols);

    expect(modules.length).toBeGreaterThan(0);
    // Every module must be strictly 1 or 0
    modules.forEach((m) => {
      expect(m === 0 || m === 1).toBe(true);
    });
  });

  it('3. Generates complete, valid SVG markup with quiet zones and human-readable text', () => {
    const svg = generateBarcodeSvg('8901234567890', {
      width: 1.5,
      height: 40,
      includeText: true
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('<rect');
    expect(svg).toContain('<text');
    expect(svg).toContain('8901234567890');
    expect(svg).toContain('</svg>');
  });

  it('4. Handles empty string gracefully without throwing', () => {
    const symbols = encodeCode128('');
    expect(symbols).toEqual([]);

    const svg = generateBarcodeSvg('');
    expect(svg).toContain('<svg');
  });
});
