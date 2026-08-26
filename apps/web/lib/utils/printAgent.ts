import { type LabelDocument } from './labelDocument';
import { type DetectedPrinter, type LabelProfile } from './labelProfiles';
import { getPrinterAdapterForProfile } from './printerAdapters';

export const DEFAULT_PRINT_AGENT_URL = 'http://127.0.0.1:9123';

export type PrintAgentHealth = {
  connected: boolean;
  version?: string;
  printers?: Array<string | DetectedPrinter>;
  error?: string;
};

export type PrintJob = {
  printerProfileId: string;
  printerName?: string;
  mediaProfile: {
    widthMm: number;
    heightMm: number;
    gapMm: number;
    sensorMode: 'GAP' | 'BLACK_MARK' | 'CONTINUOUS';
  };
  copies: number;
  document: LabelDocument;
  testMode?: boolean;
};

export type PrintAgentResult = {
  success: boolean;
  jobId?: string;
  message: string;
};

/**
 * Check connectivity and status of the local workstation Print Agent.
 */
export async function checkPrintAgentHealth(
  baseUrl: string = DEFAULT_PRINT_AGENT_URL
): Promise<PrintAgentHealth> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { connected: false, error: `Agent HTTP ${res.status}` };
    }

    const data = await res.json();
    const printers = await fetchDetectedPrinters(baseUrl).catch(() => []);
    return {
      connected: true,
      version: data.version || '1.0.0',
      printers
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message?.includes('aborted') ? 'Connection timed out' : 'Agent offline'
    };
  }
}

/**
 * Discover real printers from the local workstation agent.
 * The browser itself cannot discover arbitrary USB printers; this is agent-owned.
 */
export async function fetchDetectedPrinters(
  baseUrl: string = DEFAULT_PRINT_AGENT_URL
): Promise<Array<string | DetectedPrinter>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);

  try {
    const res = await fetch(`${baseUrl}/printers`, {
      method: 'GET',
      signal: controller.signal
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.printers)) return data.printers;
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Send a native raw command print job to the local Print Agent.
 */
export async function sendNativePrintJob(
  job: PrintJob,
  profile: LabelProfile,
  baseUrl: string = DEFAULT_PRINT_AGENT_URL
): Promise<PrintAgentResult> {
  const adapter = getPrinterAdapterForProfile(profile);
  const rawCommands = adapter.render(job.document, profile, job.copies);

  try {
    const res = await fetch(`${baseUrl}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerName: job.printerName || profile.model || profile.name || 'TVS LP-46 Dlite',
        interface: profile.interface || 'USB',
        printerLanguage: profile.printerLanguage || 'TSPL-EZ',
        copies: job.copies,
        rawCommands,
        media: {
          widthMm: profile.widthMm,
          heightMm: profile.heightMm,
          gapMm: profile.gapMm || 2,
          sensorMode: profile.sensorMode || 'GAP'
        }
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData.message || `Agent returned status ${res.status}`
      };
    }

    const data = await res.json();
    return {
      success: true,
      jobId: data.jobId || `job-${Date.now()}`,
      message: data.message || `Printed ${job.copies} label(s) successfully`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to local print agent'
    };
  }
}

/**
 * Trigger hardware media gap / black mark calibration on the thermal printer.
 */
export async function sendNativeCalibrate(
  profile: LabelProfile,
  baseUrl: string = DEFAULT_PRINT_AGENT_URL
): Promise<PrintAgentResult> {
  const adapter = getPrinterAdapterForProfile(profile);
  const rawCommands = adapter.renderCalibration(profile);

  try {
    const res = await fetch(`${baseUrl}/calibrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerName: profile.name,
        rawCommands,
        media: {
          widthMm: profile.widthMm,
          heightMm: profile.heightMm,
          gapMm: profile.gapMm || 2,
          sensorMode: profile.sensorMode || 'GAP'
        }
      })
    });

    if (!res.ok) {
      return { success: false, message: `Calibration failed: HTTP ${res.status}` };
    }

    const data = await res.json();
    return { success: true, message: data.message || 'Calibration sequence sent to printer' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Print agent unavailable' };
  }
}

/**
 * Feed one or more blank labels through the thermal printer.
 */
export async function sendNativeFeed(
  profile: LabelProfile,
  count: number = 1,
  baseUrl: string = DEFAULT_PRINT_AGENT_URL
): Promise<PrintAgentResult> {
  const adapter = getPrinterAdapterForProfile(profile);
  const rawCommands = adapter.renderFeed(profile, count);

  try {
    const res = await fetch(`${baseUrl}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerName: profile.name,
        rawCommands,
        count
      })
    });

    if (!res.ok) {
      return { success: false, message: `Feed failed: HTTP ${res.status}` };
    }

    const data = await res.json();
    return { success: true, message: data.message || `Fed ${count} label(s)` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Print agent unavailable' };
  }
}

/**
 * Send native test label to the thermal printer.
 */
export async function sendNativeTestPrint(
  profile: LabelProfile,
  baseUrl: string = DEFAULT_PRINT_AGENT_URL
): Promise<PrintAgentResult> {
  const adapter = getPrinterAdapterForProfile(profile);
  const rawCommands = adapter.renderTestLabel(profile);

  try {
    const res = await fetch(`${baseUrl}/test-print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerName: profile.name,
        rawCommands,
        media: {
          widthMm: profile.widthMm,
          heightMm: profile.heightMm,
          gapMm: profile.gapMm || 2,
          sensorMode: profile.sensorMode || 'GAP'
        }
      })
    });

    if (!res.ok) {
      return { success: false, message: `Test print failed: HTTP ${res.status}` };
    }

    const data = await res.json();
    return { success: true, message: data.message || 'Test label printed successfully' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Print agent unavailable' };
  }
}
