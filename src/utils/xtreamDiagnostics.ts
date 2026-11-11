/**
 * Xtream Codes Diagnostic Utility
 * Helps identify why categories or channels are returning empty results.
 */

export interface XtreamDiagnosticResult {
  status: number;
  isSuccess: boolean;
  rawData: any;
  error?: string;
  timestamp: string;
}

import { getPlatformUrl } from './platform';

/**
 * Tests connection to an Xtream Codes server via the local proxy.
 * Logs response structure and identifies potential blocking.
 */
export async function testXtreamConnection(
  url: string,
  user: string,
  pass: string,
  action: string = 'get_live_categories'
): Promise<XtreamDiagnosticResult> {
  const timestamp = new Date().toISOString();
  
  try {
    const proxyUrl = getPlatformUrl('xtream', url, {
      username: user,
      password: pass,
      action: action
    });
    
    console.log(`[Diagnostic] Testing action: ${action}...`);
    
    const response = await fetch(proxyUrl);
    const status = response.status;
    
    let rawData: any = null;
    let isSuccess = false;
    let error: string | undefined;

    try {
      const text = await response.text();
      try {
        rawData = JSON.parse(text);
        isSuccess = response.ok;
      } catch (parseError) {
        rawData = text; // Keep as text if not JSON
        error = 'Response is not valid JSON';
      }
    } catch (readError: any) {
      error = `Failed to read response body: ${readError.message}`;
    }

    // Special handling for common Xtream errors
    if (status === 401) error = 'Unauthorized: Check credentials';
    if (status === 404) error = 'Not Found: Check server URL';
    if (status === 429) error = 'Rate Limited: Server is blocking requests';
    if (status === 403) error = 'Forbidden: Access denied (possible IP block)';
    if (status === 502 || status === 504) error = 'Gateway Error: Upstream server timed out';

    const result: XtreamDiagnosticResult = {
      status,
      isSuccess,
      rawData,
      error,
      timestamp
    };

    // Store in global window for easy access in console if needed
    (window as any).lastXtreamDiagnostic = result;
    
    console.group(`[Xtream Diagnostic] ${action}`);
    console.log('Status:', status);
    console.log('Success:', isSuccess);
    if (error) console.error('Error:', error);
    console.log('Raw Response:', rawData);
    console.groupEnd();

    return result;
  } catch (err: any) {
    return {
      status: 0,
      isSuccess: false,
      rawData: null,
      error: `Network Error: ${err.message}`,
      timestamp
    };
  }
}

/**
 * Diagnostic history to be displayed in a hidden overlay
 */
const diagnosticHistory: XtreamDiagnosticResult[] = [];

export function addToDiagnosticHistory(result: XtreamDiagnosticResult) {
  diagnosticHistory.unshift(result);
  if (diagnosticHistory.length > 10) diagnosticHistory.pop();
  
  // Trigger custom event for overlay component
  window.dispatchEvent(new CustomEvent('xtream-diagnostic-update', { detail: result }));
}

export function getDiagnosticHistory() {
  return diagnosticHistory;
}
