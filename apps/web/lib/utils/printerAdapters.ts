import {
  type LabelDocument,
  type LabelElement,
  mmToDots
} from './labelDocument';
import {
  type LabelProfile,
  calculateLabelGeometry,
  calculateLabelTypography
} from './labelProfiles';
import { generateBarcodeSvg } from './barcode';

export interface LabelPrinterAdapter {
  id: string;
  name: string;
  canHandle(profile: LabelProfile): boolean;
  render(document: LabelDocument, profile: LabelProfile, copies?: number): string;
  renderCalibration(profile: LabelProfile): string;
  renderFeed(profile: LabelProfile, count?: number): string;
  renderTestLabel(profile: LabelProfile): string;
}

/**
 * TSPL / TSPL-EZ native printer command adapter.
 * Engineered specifically for TVS LP-46 Dlite, TSC, and TSPL-compatible thermal printers.
 */
export class TSPLAdapter implements LabelPrinterAdapter {
  id = 'tspl';
  name = 'TSPL / TSPL-EZ Native Adapter';

  canHandle(profile: LabelProfile): boolean {
    const lang = (profile.printerLanguage || '').toUpperCase();
    return lang === 'TSPL' || lang === 'TSPL-EZ' || Boolean(profile.model?.includes('LP-46'));
  }

  render(doc: LabelDocument, profile: LabelProfile, copies: number = 1): string {
    const dpi = profile.dpi || 203;
    const widthMm = profile.widthMm;
    const heightMm = profile.heightMm;
    const gapMm = profile.gapMm !== undefined ? profile.gapMm : 2;
    const marginLeftDots = mmToDots(profile.marginLeftMm || 2, dpi);
    const marginTopDots = mmToDots(profile.marginTopMm || 2, dpi);
    const xOffsetDots = mmToDots(profile.xOffsetMm || 0, dpi);
    const yOffsetDots = mmToDots(profile.yOffsetMm || 0, dpi);

    const commands: string[] = [];

    // 1. Label Dimensions
    commands.push(`SIZE ${widthMm.toFixed(1)} mm, ${heightMm.toFixed(1)} mm`);

    // 2. Media Type & Gap Sensor Calibration
    if (profile.mediaType === 'CONTINUOUS' || profile.sensorMode === 'CONTINUOUS') {
      commands.push('GAP 0 mm, 0 mm');
    } else if (profile.sensorMode === 'BLACK_MARK' || profile.mediaType === 'BLACK_MARK') {
      commands.push(`BLINE ${gapMm.toFixed(1)} mm, 0 mm`);
    } else {
      // Default: DIE_CUT with Transmissive GAP sensor
      commands.push(`GAP ${gapMm.toFixed(1)} mm, 0 mm`);
    }

    // 3. Print Direction (0 = Normal, 1 = Inverted)
    const direction = profile.orientation === 180 ? 0 : 1;
    commands.push(`DIRECTION ${direction}`);

    // 4. Origin Reference & Hardware Offset
    commands.push(`REFERENCE ${xOffsetDots},${yOffsetDots}`);
    commands.push('CLS');

    // 5. Render Label Elements
    for (const el of doc.elements) {
      if (el.type === 'text') {
        const textX = marginLeftDots + mmToDots(el.xMm, dpi);
        const textY = marginTopDots + mmToDots(el.yMm, dpi);
        const escaped = el.value.replace(/"/g, '\\["');

        // Map font size to TSPL bitmap multiplier or font code
        let fontCode = '3'; // 12x24 bitmap font
        let xMulti = 1;
        let yMulti = 1;

        if (el.fontSizeMm > 3.0) {
          xMulti = 2;
          yMulti = 2;
        } else if (el.fontSizeMm < 1.8) {
          fontCode = '2'; // 10x16 bitmap font
        }

        // TSPL TEXT command: TEXT x,y,"font",rotation,x-multi,y-multi,"content"
        commands.push(`TEXT ${textX},${textY},"${fontCode}",0,${xMulti},${yMulti},"${escaped}"`);
      } else if (el.type === 'barcode') {
        const barcodeX = marginLeftDots + mmToDots(el.xMm, dpi);
        const barcodeY = marginTopDots + mmToDots(el.yMm, dpi);
        const barHeightDots = mmToDots(el.heightMm - (el.showHumanReadableText ? 4 : 0), dpi);
        const narrowDots = Math.max(1, Math.round(mmToDots(el.moduleWidthMm || 0.25, dpi)));
        const wideDots = narrowDots * 2;
        const readable = el.showHumanReadableText ? 1 : 0;

        let tsplBarcodeType = '128';
        if (el.format === 'EAN13') tsplBarcodeType = 'EAN13';
        else if (el.format === 'EAN8') tsplBarcodeType = 'EAN8';
        else if (el.format === 'UPC') tsplBarcodeType = 'UPCA';

        // TSPL BARCODE command: BARCODE x,y,"type",height,human_readable,rotation,narrow,wide,"content"
        commands.push(
          `BARCODE ${barcodeX},${barcodeY},"${tsplBarcodeType}",${barHeightDots},${readable},0,${narrowDots},${wideDots},"${el.value}"`
        );
      }
    }

    // 6. Print Execution
    commands.push(`PRINT ${Math.max(1, copies)},1\n`);
    return commands.join('\r\n');
  }

  renderCalibration(profile: LabelProfile): string {
    const commands: string[] = [];
    const gapMm = profile.gapMm !== undefined ? profile.gapMm : 2;

    commands.push(`SIZE ${profile.widthMm.toFixed(1)} mm, ${profile.heightMm.toFixed(1)} mm`);
    if (profile.sensorMode === 'BLACK_MARK') {
      commands.push(`BLINE ${gapMm.toFixed(1)} mm, 0 mm`);
    } else {
      commands.push(`GAP ${gapMm.toFixed(1)} mm, 0 mm`);
    }
    commands.push('GAPDETECT');
    commands.push('HOME\n');
    return commands.join('\r\n');
  }

  renderFeed(profile: LabelProfile, count: number = 1): string {
    return `FEED ${Math.max(1, count)}\r\n`;
  }

  renderTestLabel(profile: LabelProfile): string {
    const dpi = profile.dpi || 203;
    const widthMm = profile.widthMm;
    const heightMm = profile.heightMm;
    const gapMm = profile.gapMm !== undefined ? profile.gapMm : 2;

    const commands: string[] = [
      `SIZE ${widthMm.toFixed(1)} mm, ${heightMm.toFixed(1)} mm`,
      `GAP ${gapMm.toFixed(1)} mm, 0 mm`,
      'DIRECTION 1',
      'CLS',
      // Corner alignment markers
      'BOX 8,8,48,48,2',
      `BOX ${mmToDots(widthMm, dpi) - 48},8,${mmToDots(widthMm, dpi) - 8},48,2`,
      // Header info
      'TEXT 56,16,"3",0,1,1,"VC ORGANICS TEST"',
      `TEXT 56,42,"2",0,1,1,"TVS LP-46 Dlite (${dpi} DPI)"`,
      `TEXT 56,64,"2",0,1,1,"Media: ${widthMm}x${heightMm}mm Gap: ${gapMm}mm"`,
      `TEXT 56,86,"2",0,1,1,"Sensor: ${profile.sensorMode || 'GAP'}"`,
      // Test Barcode
      'BARCODE 56,115,"128",48,1,0,2,4,"AIA000002"',
      // Footer status
      'TEXT 56,190,"2",0,1,1,"CALIBRATION VERIFIED OK"',
      'PRINT 1,1\n'
    ];

    return commands.join('\r\n');
  }
}

/**
 * ZPL II native printer command adapter.
 * Engineered for Zebra and ZPL II-compatible thermal printers.
 */
export class ZPLAdapter implements LabelPrinterAdapter {
  id = 'zpl';
  name = 'ZPL II Native Adapter';

  canHandle(profile: LabelProfile): boolean {
    const lang = (profile.printerLanguage || '').toUpperCase();
    return lang === 'ZPL' || lang === 'ZPL-II' || Boolean(profile.model?.includes('Zebra'));
  }

  render(doc: LabelDocument, profile: LabelProfile, copies: number = 1): string {
    const dpi = profile.dpi || 203;
    const widthDots = mmToDots(profile.widthMm, dpi);
    const heightDots = mmToDots(profile.heightMm, dpi);
    const marginLeftDots = mmToDots(profile.marginLeftMm || 2, dpi);
    const marginTopDots = mmToDots(profile.marginTopMm || 2, dpi);

    const commands: string[] = ['^XA', `^PW${widthDots}`, `^LL${heightDots}`];

    if (profile.sensorMode === 'CONTINUOUS') {
      commands.push('^MNN');
    } else if (profile.sensorMode === 'BLACK_MARK') {
      commands.push('^MNM');
    } else {
      commands.push('^MNY'); // Transmissive gap sensing
    }

    for (const el of doc.elements) {
      if (el.type === 'text') {
        const x = marginLeftDots + mmToDots(el.xMm, dpi);
        const y = marginTopDots + mmToDots(el.yMm, dpi);
        const fontHeight = Math.max(16, mmToDots(el.fontSizeMm, dpi));
        commands.push(`^FO${x},${y}^A0N,${fontHeight},${Math.round(fontHeight * 0.85)}^FD${el.value}^FS`);
      } else if (el.type === 'barcode') {
        const x = marginLeftDots + mmToDots(el.xMm, dpi);
        const y = marginTopDots + mmToDots(el.yMm, dpi);
        const barHeight = mmToDots(el.heightMm - (el.showHumanReadableText ? 4 : 0), dpi);
        const moduleDots = Math.max(1, Math.round(mmToDots(el.moduleWidthMm || 0.25, dpi)));
        commands.push(`^FO${x},${y}^BY${moduleDots},2.5,${barHeight}^BCN,${barHeight},${el.showHumanReadableText ? 'Y' : 'N'},N,N^FD${el.value}^FS`);
      }
    }

    commands.push(`^PQ${Math.max(1, copies)}`, '^XZ\n');
    return commands.join('\n');
  }

  renderCalibration(_profile: LabelProfile): string {
    return '^XA~JC^XZ\n';
  }

  renderFeed(_profile: LabelProfile, count: number = 1): string {
    return `^XA^PF${count}^XZ\n`;
  }

  renderTestLabel(profile: LabelProfile): string {
    const dpi = profile.dpi || 203;
    return `^XA^PW${mmToDots(profile.widthMm, dpi)}^LL${mmToDots(profile.heightMm, dpi)}^FO40,30^A0N,28,24^FDVC ORGANICS TEST^FS^FO40,70^A0N,20,18^FDZebra ZPL II 203 DPI^FS^FO40,110^BY2,2.5,50^BCN,50,Y,N,N^FDAIA000002^FS^PQ1^XZ\n`;
  }
}

/**
 * EPL native printer command adapter.
 * Engineered for Eltron/Zebra EPL printers.
 */
export class EPLAdapter implements LabelPrinterAdapter {
  id = 'epl';
  name = 'EPL Native Adapter';

  canHandle(profile: LabelProfile): boolean {
    const lang = (profile.printerLanguage || '').toUpperCase();
    return lang === 'EPL' || Boolean(profile.model?.includes('Eltron'));
  }

  render(doc: LabelDocument, profile: LabelProfile, copies: number = 1): string {
    const dpi = profile.dpi || 203;
    const widthDots = mmToDots(profile.widthMm, dpi);
    const heightDots = mmToDots(profile.heightMm, dpi);
    const gapDots = mmToDots(profile.gapMm || 2, dpi);

    const commands: string[] = [
      'N',
      `q${widthDots}`,
      `Q${heightDots},${gapDots}`
    ];

    for (const el of doc.elements) {
      if (el.type === 'text') {
        const x = mmToDots(el.xMm, dpi);
        const y = mmToDots(el.yMm, dpi);
        commands.push(`A${x},${y},0,3,1,1,N,"${el.value}"`);
      } else if (el.type === 'barcode') {
        const x = mmToDots(el.xMm, dpi);
        const y = mmToDots(el.yMm, dpi);
        const barHeight = mmToDots(el.heightMm, dpi);
        commands.push(`B${x},${y},0,1,2,4,${barHeight},B,"${el.value}"`);
      }
    }

    commands.push(`P${Math.max(1, copies)}\n`);
    return commands.join('\n');
  }

  renderCalibration(_profile: LabelProfile): string {
    return 'N\nJC\nP1\n';
  }

  renderFeed(_profile: LabelProfile, count: number = 1): string {
    return `N\nPF${count}\n`;
  }

  renderTestLabel(profile: LabelProfile): string {
    return `N\nq${mmToDots(profile.widthMm, profile.dpi || 203)}\nQ${mmToDots(profile.heightMm, profile.dpi || 203)},16\nA30,20,0,3,1,1,N,"VC ORGANICS TEST"\nB30,70,0,1,2,4,40,B,"AIA000002"\nP1\n`;
  }
}

/**
 * Universal Browser / HTML print document generator adapter.
 */
export class BrowserPrintAdapter implements LabelPrinterAdapter {
  id = 'browser';
  name = 'Standard Browser Print';

  canHandle(_profile: LabelProfile): boolean {
    return true; // Universal fallback
  }

  render(_doc: LabelDocument, profile: LabelProfile, _copies: number = 1): string {
    const geometry = calculateLabelGeometry(profile);
    return `/* Browser print engine uses physical mm @page CSS sizing */ @page { size: ${geometry.widthMm}mm ${geometry.heightMm}mm; margin: 0; }`;
  }

  renderCalibration(_profile: LabelProfile): string {
    return '';
  }

  renderFeed(_profile: LabelProfile): string {
    return '';
  }

  renderTestLabel(_profile: LabelProfile): string {
    return '';
  }
}

export const REGISTERED_PRINTER_ADAPTERS: LabelPrinterAdapter[] = [
  new TSPLAdapter(),
  new ZPLAdapter(),
  new EPLAdapter(),
  new BrowserPrintAdapter()
];

/**
 * Select the appropriate native printer adapter for a given profile.
 */
export function getPrinterAdapterForProfile(profile: LabelProfile): LabelPrinterAdapter {
  for (const adapter of REGISTERED_PRINTER_ADAPTERS) {
    if (adapter.canHandle(profile)) {
      return adapter;
    }
  }
  return REGISTERED_PRINTER_ADAPTERS[REGISTERED_PRINTER_ADAPTERS.length - 1]; // Browser fallback
}
