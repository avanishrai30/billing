/**
 * Standard Code 128 Barcode Generator (Pure TypeScript / SVG)
 * Symbology: Code 128 Auto (Automatic Subset B & Subset C Optimization)
 * Compliant with ISO/IEC 15417
 */

// Code 128 bar/space width patterns (107 symbols, indices 0-106)
// Each 6-character string represents widths of 3 bars and 3 spaces (total 11 modules),
// except index 106 (Stop symbol) which has 7 characters (total 13 modules).
const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"                               // 100-106
];

export const CODE_SWITCH_TO_C = 99;
export const CODE_SWITCH_TO_B = 100;
export const START_CODE_B = 104;
export const START_CODE_C = 105;
export const STOP_CODE = 106;

export interface BarcodeRenderOptions {
  width?: number;         // width of single module bar (default: 1.5px)
  height?: number;        // height of bars (default: 45px)
  includeText?: boolean;  // whether to show human-readable text below (default: true)
  fontSize?: number;      // text font size (default: 10px)
  quietZone?: number;     // margin modules on left/right (default: 10)
  color?: string;         // bar and text color (default: '#000000')
  backgroundColor?: string; // canvas/svg background (default: '#ffffff' or 'transparent')
}

/**
 * Count consecutive numeric digits starting at index `pos`
 */
function countConsecutiveDigits(str: string, pos: number): number {
  let count = 0;
  for (let i = pos; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    if (ch >= 48 && ch <= 57) { // '0'-'9'
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Encode an ASCII string into Code 128 symbols with automatic Subset B / Subset C switching.
 */
export function encodeCode128(text: string): number[] {
  const clean = (text || '').trim();
  if (!clean) return [];

  let pos = 0;
  let currentSubset: 'B' | 'C' = 'B';
  const symbols: number[] = [];

  // Determine starting subset: if starts with 4 or more digits, use Subset C
  const initialDigits = countConsecutiveDigits(clean, 0);
  if (initialDigits >= 4) {
    currentSubset = 'C';
    symbols.push(START_CODE_C);
  } else {
    currentSubset = 'B';
    symbols.push(START_CODE_B);
  }

  while (pos < clean.length) {
    if (currentSubset === 'C') {
      const remainingDigits = countConsecutiveDigits(clean, pos);
      if (remainingDigits >= 2) {
        // Encode pair of 2 digits as a single Subset C symbol
        const pair = clean.slice(pos, pos + 2);
        symbols.push(parseInt(pair, 10));
        pos += 2;
      } else {
        // Switch to Subset B for single digit or non-digit
        currentSubset = 'B';
        symbols.push(CODE_SWITCH_TO_B);
      }
    } else {
      // In Subset B: check if a long numeric sequence (4+ digits) warrants switching to Subset C
      const nextDigits = countConsecutiveDigits(clean, pos);
      if (nextDigits >= 4) {
        currentSubset = 'C';
        symbols.push(CODE_SWITCH_TO_C);
      } else {
        const charCode = clean.charCodeAt(pos);
        // ASCII 32 to 126
        const val = charCode >= 32 && charCode <= 126 ? charCode - 32 : 0;
        symbols.push(val);
        pos++;
      }
    }
  }

  // Calculate Checksum: (start_symbol + sum(i * value_i)) % 103
  let checkSum = symbols[0];
  for (let i = 1; i < symbols.length; i++) {
    checkSum += symbols[i] * i;
  }
  const checkDigit = checkSum % 103;

  symbols.push(checkDigit);
  symbols.push(STOP_CODE);

  return symbols;
}

/**
 * Convert Code 128 symbols into binary modules array (1=bar, 0=space)
 */
export function symbolsToModules(symbols: number[]): number[] {
  const modules: number[] = [];

  for (const sym of symbols) {
    const pattern = CODE128_PATTERNS[sym];
    if (!pattern) continue;

    let isBar = true;
    for (let i = 0; i < pattern.length; i++) {
      const width = parseInt(pattern[i], 10);
      for (let w = 0; w < width; w++) {
        modules.push(isBar ? 1 : 0);
      }
      isBar = !isBar;
    }
  }

  return modules;
}

/**
 * Generate pure SVG string for a given barcode value
 */
export function generateBarcodeSvg(
  value: string,
  options: BarcodeRenderOptions = {}
): string {
  const {
    width = 1.5,
    height = 40,
    includeText = true,
    fontSize = 11,
    quietZone = 10,
    color = '#000000',
    backgroundColor = 'transparent'
  } = options;

  const displayVal = (value || '').trim();
  if (!displayVal) {
    return '';
  }

  const symbols = encodeCode128(displayVal);
  const modules = symbolsToModules(symbols);

  const totalModules = modules.length + quietZone * 2;
  const svgWidth = totalModules * width;
  const textHeight = includeText ? fontSize + 4 : 0;
  const svgHeight = height + textHeight;

  let rects = '';
  let startX = quietZone * width;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === 1) {
      let runLength = 1;
      while (i + 1 < modules.length && modules[i + 1] === 1) {
        runLength++;
        i++;
      }
      const x = startX;
      const barW = runLength * width;
      rects += `<rect x="${x.toFixed(2)}" y="0" width="${barW.toFixed(2)}" height="${height}" fill="${color}" />`;
      startX += barW;
    } else {
      startX += width;
    }
  }

  const textElement = includeText
    ? `<text x="${(svgWidth / 2).toFixed(2)}" y="${(height + fontSize + 1).toFixed(2)}" text-anchor="middle" font-family="monospace, monospace" font-size="${fontSize}px" font-weight="600" fill="${color}" letter-spacing="1.5px">${displayVal}</text>`
    : '';

  const bgRect = backgroundColor !== 'transparent'
    ? `<rect width="100%" height="100%" fill="${backgroundColor}" />`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth.toFixed(2)} ${svgHeight.toFixed(2)}" width="${svgWidth.toFixed(2)}" height="${svgHeight.toFixed(2)}" style="max-width:100%; height:auto; display:block; margin:0 auto">${bgRect}${rects}${textElement}</svg>`;
}
