import type { ScanModule, ScanDepth, TargetDevice, CheckStep, ScanRequest, ScanResult, AuditEntry } from '../types';

const API_BASE = 'http://127.0.0.1:8765';
const WS_BASE = 'ws://127.0.0.1:8765';

export async function checkBackendHealth(): Promise<{ status: string; app: string; version: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    return { status: 'offline', app: 'KING STING VULNScanner', version: 'unknown' };
  }
}

export async function getDevices(module: ScanModule): Promise<TargetDevice[]> {
  const res = await fetch(`${API_BASE}/api/devices/${module}`);
  if (!res.ok) throw new Error(`Failed to load devices for ${module}`);
  return await res.json();
}

export async function getScanSteps(module: ScanModule, depth: ScanDepth): Promise<CheckStep[]> {
  const res = await fetch(`${API_BASE}/api/scans/steps/${module}/${depth}`);
  if (!res.ok) throw new Error(`Failed to load steps for ${module}/${depth}`);
  return await res.json();
}

export async function startScan(request: ScanRequest): Promise<{ status: string; message: string; module: string; depth: string }> {
  const res = await fetch(`${API_BASE}/api/scans/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to initiate scan' }));
    throw new Error(errorData.detail || 'Scan request failed');
  }
  return await res.json();
}

export async function getScanResult(scanId: string): Promise<ScanResult> {
  const res = await fetch(`${API_BASE}/api/scans/${scanId}`);
  if (!res.ok) throw new Error('Failed to retrieve scan result');
  return await res.json();
}

export async function getAuditLogs(limit: number = 50): Promise<AuditEntry[]> {
  const res = await fetch(`${API_BASE}/api/audit/logs?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to load audit logs');
  return await res.json();
}

export function getPdfDownloadUrl(scanId: string): string {
  return `${API_BASE}/api/scans/${scanId}/pdf`;
}

export function connectScanWebSocket(
  scanId: string,
  onEvent: (event: any) => void,
  onClose?: () => void,
  onError?: (err: any) => void
): WebSocket {
  const socket = new WebSocket(`${WS_BASE}/ws/scans/${scanId}`);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch (e) {
      console.error('Failed to parse WS message:', e);
    }
  };

  socket.onerror = (err) => {
    console.error('WebSocket error:', err);
    if (onError) onError(err);
  };

  socket.onclose = () => {
    if (onClose) onClose();
  };

  return socket;
}
