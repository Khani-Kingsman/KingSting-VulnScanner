import type { ScanModule, ScanDepth, TargetDevice, CheckStep, ScanRequest, ScanResult, AuditEntry } from '../types';

const getHost = () => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return window.location.hostname;
  }
  return '127.0.0.1';
};

const API_BASE = typeof window !== 'undefined' && window.location.protocol.startsWith('http')
  ? `${window.location.protocol}//${getHost()}:8765`
  : 'http://127.0.0.1:8765';

const WS_BASE = typeof window !== 'undefined' && window.location.protocol === 'https:'
  ? `wss://${getHost()}:8765`
  : `ws://${getHost()}:8765`;

export async function checkBackendHealth(): Promise<{ status: string; app: string; version: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    return { status: 'offline', app: 'KING STING VULNScanner', version: 'unknown' };
  }
}

export async function getMobileQrCode(): Promise<{ qr_image: string; pairing_url: string; local_ip: string }> {
  const res = await fetch(`${API_BASE}/api/devices/qr-code`);
  if (!res.ok) throw new Error('Failed to load mobile pairing QR code');
  return await res.json();
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

export async function pairWifiAdb(ipPort: string, pairingCode: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/devices/pair-wifi-adb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip_port: ipPort, pairing_code: pairingCode })
  });
  return await res.json();
}

export async function connectWifiAdb(ipPort: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/devices/connect-wifi-adb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip_port: ipPort })
  });
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

export async function deleteDevice(deviceIdOrIp: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/devices/${encodeURIComponent(deviceIdOrIp)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete device');
  return await res.json();
}

export async function clearOfflineDevices(): Promise<{ success: boolean; cleared_count: number; message: string }> {
  const res = await fetch(`${API_BASE}/api/devices/clear-offline`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to clear offline devices');
  return await res.json();
}

export async function getAuthorizedDevices(): Promise<TargetDevice[]> {
  const res = await fetch(`${API_BASE}/api/devices/authorized`);
  if (!res.ok) throw new Error('Failed to load authorized devices');
  return await res.json();
}

export async function authorizeDevice(deviceData: Partial<TargetDevice>): Promise<{ success: boolean; message: string; device: TargetDevice }> {
  const res = await fetch(`${API_BASE}/api/devices/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deviceData)
  });
  if (!res.ok) throw new Error('Failed to authorize device');
  return await res.json();
}

export async function unauthorizeDevice(deviceId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/devices/authorized/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to unauthorize device');
  return await res.json();
}

export async function notifyDeviceAudit(ipOrSerial: string, name?: string, message?: string): Promise<{ success: boolean; notified: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/devices/notify-audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip_or_serial: ipOrSerial, name, message })
  });
  if (!res.ok) throw new Error('Failed to dispatch audit notification');
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
