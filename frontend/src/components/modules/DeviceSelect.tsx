import React, { useState, useEffect } from 'react';
import type { TargetDevice, ScanModule } from '../../types';
import {
  getDevices,
  pairWifiAdb,
  connectWifiAdb,
  getMobileQrCode,
  deleteDevice,
  clearOfflineDevices,
  getAuthorizedDevices,
  authorizeDevice,
  unauthorizeDevice,
  notifyDeviceAudit
} from '../../services/api';
import {
  Smartphone,
  Wifi,
  Apple,
  Usb,
  Radio,
  RefreshCw,
  CheckCircle,
  ChevronLeft,
  ShieldCheck,
  Shield,
  Plus,
  Send,
  Network,
  Laptop,
  QrCode,
  Copy,
  ExternalLink,
  Check,
  Trash2,
  WifiOff,
  Bell,
  Lock,
  X,
  Play
} from 'lucide-react';

interface DeviceSelectProps {
  module: ScanModule;
  onBack: () => void;
  onSelectDevice: (device: TargetDevice) => void;
}

export const DeviceSelect: React.FC<DeviceSelectProps> = ({
  module,
  onBack,
  onSelectDevice
}) => {
  const [devices, setDevices] = useState<TargetDevice[]>([]);
  const [authorizedDevices, setAuthorizedDevices] = useState<TargetDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<TargetDevice | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Security Audit Authorization Modal State
  const [auditModalTarget, setAuditModalTarget] = useState<TargetDevice | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  // Wireless Android Mode Selection: 'qr' vs 'pair' vs 'connect'
  const [adbMode, setAdbMode] = useState<'qr' | 'pair' | 'connect'>('qr');

  // QR Code State
  const [qrInfo, setQrInfo] = useState<{ qr_image: string; pairing_url: string; local_ip: string } | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Wireless ADB Pairing State
  const [pairingIpPort, setPairingIpPort] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [isPairing, setIsPairing] = useState(false);
  const [pairingMessage, setPairingMessage] = useState<string | null>(null);

  // Wireless ADB Direct Connect State
  const [wifiAdbIp, setWifiAdbIp] = useState('');
  const [connectingAdb, setConnectingAdb] = useState(false);
  const [adbConnectMessage, setAdbConnectMessage] = useState<string | null>(null);

  // Manual target entry
  const [manualIp, setManualIp] = useState('');
  const [manualName, setManualName] = useState('');

  const fetchDeviceList = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [allDevices, authList] = await Promise.all([
        getDevices(module),
        getAuthorizedDevices()
      ]);
      setDevices(allDevices);
      setAuthorizedDevices(authList);

      setSelectedDevice((prev) => {
        if (prev) {
          const stillAuth = authList.find((d) => d.id === prev.id || d.ip_or_serial === prev.ip_or_serial);
          if (stillAuth) return stillAuth;
          const stillAll = allDevices.find((d) => d.id === prev.id || d.ip_or_serial === prev.ip_or_serial);
          if (stillAll) return stillAll;
        }
        if (authList.length > 0) {
          const onlineAuth = authList.find((d) => d.status === 'online');
          return onlineAuth || authList[0];
        }
        return allDevices[0] || null;
      });
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Fetch QR Code for pairing
  useEffect(() => {
    setLoadingQr(true);
    getMobileQrCode()
      .then((res) => setQrInfo(res))
      .catch((err) => console.error('Failed to generate QR:', err))
      .finally(() => setLoadingQr(false));
  }, [module]);

  // Periodic background refresh
  useEffect(() => {
    fetchDeviceList();
    const timer = setInterval(() => {
      fetchDeviceList(true);
    }, 2500);
    return () => clearInterval(timer);
  }, [module]);

  const triggerScan = () => {
    setIsScanning(true);
    fetchDeviceList().finally(() => {
      setTimeout(() => setIsScanning(false), 800);
    });
  };

  // Open Security Audit Authorization Modal & send initial notification beacon
  const handleOpenAuditModal = async (device: TargetDevice) => {
    setAuditModalTarget(device);
    setNotifying(true);
    setNotificationStatus('Transmitting audit handshake packet to device...');
    try {
      const res = await notifyDeviceAudit(device.ip_or_serial, device.name);
      setNotificationStatus(
        res.notified
          ? `Audit request beacon acknowledged by ${device.ip_or_serial}`
          : 'Handshake dispatched to device.'
      );
    } catch (err: any) {
      setNotificationStatus(`Beacon status: Handshake probe sent (${err.message || 'Complete on-device steps'})`);
    } finally {
      setNotifying(false);
    }
  };

  // Resend notification ping
  const handleResendNotification = async () => {
    if (!auditModalTarget) return;
    setNotifying(true);
    setNotificationStatus('Re-sending audit notification probe to device...');
    try {
      const res = await notifyDeviceAudit(auditModalTarget.ip_or_serial, auditModalTarget.name);
      setNotificationStatus(res.message || 'Audit beacon acknowledged.');
    } catch (err: any) {
      setNotificationStatus(`Probe dispatched: ${err.message || 'Target notified'}`);
    } finally {
      setNotifying(false);
    }
  };

  // Confirm authorization & add device into Authorized Audit Targets table
  const handleConfirmAuthorization = async (device: TargetDevice) => {
    try {
      const res = await authorizeDevice({
        id: `auth_${device.ip_or_serial.replace('.', '_')}`,
        name: device.name,
        module: module,
        connection_mode: device.connection_mode || 'network',
        ip_or_serial: device.ip_or_serial,
        os_version: device.os_version,
        model_name: device.model_name || device.name,
        vendor: device.vendor || 'Authorized Target'
      });
      setAuditModalTarget(null);
      setSelectedDevice(res.device);
      await fetchDeviceList(true);
    } catch (err) {
      console.error('Failed to authorize device:', err);
    }
  };

  // Remove/Unauthorize device
  const handleRemoveDevice = async (device: TargetDevice) => {
    if (window.confirm(`Delete & remove '${device.name}' (${device.ip_or_serial}) from scanner?`)) {
      try {
        await unauthorizeDevice(device.id);
        await deleteDevice(device.ip_or_serial);
        if (selectedDevice?.id === device.id || selectedDevice?.ip_or_serial === device.ip_or_serial) {
          setSelectedDevice(null);
        }
        await fetchDeviceList(true);
      } catch (err) {
        console.error('Failed to remove device:', err);
      }
    }
  };

  // Pair via 6-digit code (Android 11+)
  const handlePairWifiAdb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingIpPort.trim() || !pairingCode.trim()) return;
    setIsPairing(true);
    setPairingMessage('Transmitting pairing credentials to Android device...');

    try {
      const res = await pairWifiAdb(pairingIpPort.trim(), pairingCode.trim());
      setPairingMessage(res.message || (res.success ? 'Successfully paired! Now connect to the main debugging port.' : 'Pairing failed.'));
      if (res.success) {
        fetchDeviceList();
      }
    } catch (err: any) {
      setPairingMessage(`Pairing error: ${err.message || err}`);
    } finally {
      setIsPairing(false);
    }
  };

  // Direct connect (IP:Port)
  const handleConnectWifiAdb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wifiAdbIp.trim()) return;
    setConnectingAdb(true);
    setAdbConnectMessage('Attempting wireless ADB connection...');

    try {
      const res = await connectWifiAdb(wifiAdbIp.trim());
      setAdbConnectMessage(res.message || (res.success ? 'Connected successfully!' : 'Connection failed.'));
      fetchDeviceList();
    } catch (err: any) {
      setAdbConnectMessage(`Error: ${err.message || err}`);
    } finally {
      setConnectingAdb(false);
    }
  };

  const handleAddManualTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;

    const customDevice: TargetDevice = {
      id: `manual_${Date.now()}`,
      name: manualName.trim() || `Manual Target (${manualIp.trim()})`,
      module: module,
      connection_mode: 'network',
      ip_or_serial: manualIp.trim(),
      os_version: 'Target Configured by Auditor',
      model_name: manualName.trim() || 'Custom Network Target',
      vendor: 'Manual Audit Endpoint',
      status: 'online'
    };

    authorizeDevice(customDevice).then(() => {
      fetchDeviceList();
      setSelectedDevice(customDevice);
      setManualIp('');
      setManualName('');
    });
  };

  const getModuleIcon = () => {
    if (module === 'android') return <Smartphone className="w-5 h-5 text-emerald-400" />;
    if (module === 'wireless') return <Wifi className="w-5 h-5 text-cyan-400" />;
    return <Apple className="w-5 h-5 text-blue-400" />;
  };

  const getDeviceIcon = (device: TargetDevice) => {
    const nameLower = (device.name + ' ' + (device.os_version || '')).toLowerCase();
    if (device.connection_mode === 'usb') return <Usb className="w-5 h-5 text-cyan-400" />;
    if (nameLower.includes('router') || nameLower.includes('gateway') || nameLower.includes('access point')) {
      return <Radio className="w-5 h-5 text-amber-400" />;
    }
    if (
      nameLower.includes('s10') ||
      nameLower.includes('galaxy') ||
      nameLower.includes('smartphone') ||
      nameLower.includes('mobile') ||
      nameLower.includes('phone') ||
      nameLower.includes('android') ||
      nameLower.includes('killer')
    ) {
      return <Smartphone className="w-5 h-5 text-emerald-400" />;
    }
    if (nameLower.includes('iphone') || nameLower.includes('ipad') || nameLower.includes('apple')) {
      return <Apple className="w-5 h-5 text-blue-400" />;
    }
    if (nameLower.includes('host') || nameLower.includes('laptop') || nameLower.includes('pc') || nameLower.includes('auditor console')) {
      return <Laptop className="w-5 h-5 text-slate-300" />;
    }
    return <Network className="w-5 h-5 text-cyan-400" />;
  };

  // Filter discovered devices that are not already authorized
  const unauthDiscoveredDevices = devices.filter(
    (d) => !authorizedDevices.some((a) => a.ip_or_serial === d.ip_or_serial || a.id === d.id)
  );

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4">
      {/* Top Breadcrumb & Action */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-slate-800"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Modules</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
          {getModuleIcon()}
          <span className="font-semibold text-slate-200 capitalize">{module} Hardware Interrogation</span>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
          {module === 'android'
            ? 'Android Physical & Wireless Interrogation'
            : module === 'wireless'
            ? 'Live Wi-Fi Subnet & Connected Devices'
            : 'Hardware & Interface Discovery'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          {module === 'wireless'
            ? 'Discovers all devices connected to the router. Select any connected device and click SECURITY AUDIT to authorize it for scanning.'
            : 'Connect via USB cable or completely wirelessly using Android 11+ Wireless Debugging & QR Code onboarding.'}
        </p>
      </div>

      {/* Action Bar: Re-Scan Subnet / Hardware */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/70 border border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">
              {module === 'wireless' ? 'Subnet ARP & Host Discovery Active (/24 Subnet)' : 'Live Hardware Scanner Active'}
            </h4>
            <p className="text-[11px] text-slate-400">
              {devices.length} router node(s) detected • {authorizedDevices.length} target(s) authorized for audit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await clearOfflineDevices();
                fetchDeviceList(false);
              } catch (err) {
                console.error('Failed to clear offline devices:', err);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            title="Remove unreachable / offline devices"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear Offline</span>
          </button>

          <button
            onClick={triggerScan}
            disabled={isScanning || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isScanning ? 'Scanning Subnet...' : 'Re-scan Subnet Devices'}</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TABLE 1: AUTHORIZED AUDIT TARGETS (Available for Auditing)     */}
      {/* ============================================================== */}
      <div className="mb-8 p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-cyan-500/30 shadow-xl shadow-cyan-950/20">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Authorized Devices — Available for Auditing</span>
                <span className="px-2 py-0.2 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold">
                  {authorizedDevices.length} READY
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                These targets have completed authorization and are approved for defensive security inspection.
              </p>
            </div>
          </div>
        </div>

        {authorizedDevices.length > 0 ? (
          <div className="space-y-2.5">
            {authorizedDevices.map((device) => {
              const isSelected = selectedDevice?.id === device.id || selectedDevice?.ip_or_serial === device.ip_or_serial;
              return (
                <div
                  key={device.id}
                  onClick={() => setSelectedDevice(device)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-850 border-cyan-500 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                      : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-xl border ${
                        isSelected ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-slate-800/80 border-slate-700'
                      }`}
                    >
                      {getDeviceIcon(device)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-white">{device.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${
                            device.status === 'online'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border-rose-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              device.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          <span>{device.status}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-950 text-cyan-300 border border-cyan-800">
                          Authorized
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>
                          <strong className="text-slate-500">IP / Endpoint:</strong>{' '}
                          <span className="font-mono text-cyan-300">{device.ip_or_serial}</span>
                        </span>
                        {device.os_version && (
                          <span>
                            <strong className="text-slate-500">Profile:</strong> {device.os_version}
                          </span>
                        )}
                        <span>
                          <strong className="text-slate-500">Mode:</strong> {device.connection_mode.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      title="Remove from Authorized Queue"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveDevice(device);
                      }}
                      className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-700/60 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected ? 'border-cyan-400 bg-cyan-500 text-white' : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-center">
            <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium mb-1">No devices authorized for auditing yet.</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Find your device in the <strong>Discovered Subnet Nodes</strong> table below and click{' '}
              <strong className="text-cyan-400">SECURITY AUDIT</strong>, or scan the QR code to authorize it immediately.
            </p>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* TABLE 2: DISCOVERED WI-FI & SUBNET NODES                       */}
      {/* ============================================================== */}
      <div className="mb-8">
        <div className="px-1 mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>Discovered Wi-Fi & Subnet Nodes ({unauthDiscoveredDevices.length} Connected to Router)</span>
          </div>
          <span className="text-[11px] text-slate-500 font-normal">
            Click <strong>SECURITY AUDIT</strong> to authorize any device
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3 bg-slate-900/60 rounded-2xl border border-slate-800">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <span>Interrogating router subnet ARP tables and sweeping live IPv4 nodes...</span>
          </div>
        ) : unauthDiscoveredDevices.length > 0 ? (
          <div className="space-y-3">
            {unauthDiscoveredDevices.map((device) => {
              return (
                <div
                  key={device.id}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700">
                      {getDeviceIcon(device)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-white">{device.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${
                            device.status === 'online'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border-rose-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              device.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          <span>{device.status}</span>
                        </span>
                        {device.vendor && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {device.vendor}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>
                          <strong className="text-slate-500">IP:</strong>{' '}
                          <span className="font-mono text-cyan-300">{device.ip_or_serial}</span>
                        </span>
                        {device.os_version && (
                          <span>
                            <strong className="text-slate-500">Hardware / MAC:</strong> {device.os_version}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenAuditModal(device)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>SECURITY AUDIT</span>
                    </button>

                    <button
                      type="button"
                      title="Dismiss Host"
                      onClick={() => handleRemoveDevice(device)}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
            <span>No unmapped subnet nodes. All discovered devices are either authorized or offline.</span>
          </div>
        )}
      </div>

      {/* Cable-Free Wireless Debugging & QR Section */}
      <div className="mb-8 p-6 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-xl shadow-emerald-950/20">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Connect Mobile Wirelessly via QR Portal (Cable-Free)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                  Auto-Authorizes
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Scan with any Android phone camera or connect via Wireless Debugging port.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setAdbMode('qr')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                adbMode === 'qr'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Scan QR Code</span>
            </button>
            <button
              type="button"
              onClick={() => setAdbMode('pair')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                adbMode === 'pair'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Pairing Code</span>
            </button>
            <button
              type="button"
              onClick={() => setAdbMode('connect')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                adbMode === 'connect'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Direct Port 5555</span>
            </button>
          </div>
        </div>

        {/* Mode 1: QR Code Scanner */}
        {adbMode === 'qr' && (
          <div className="flex flex-col md:flex-row items-center gap-6 p-4 rounded-xl bg-slate-950/70 border border-slate-850">
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900 border border-cyan-500/40 shadow-lg shadow-cyan-950/30 shrink-0">
              {loadingQr ? (
                <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                </div>
              ) : qrInfo?.qr_image ? (
                <img
                  src={qrInfo.qr_image}
                  alt="Mobile Pairing QR Code"
                  className="w-40 h-40 rounded-lg shadow-md border border-cyan-500/30"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-500">
                  QR unavailable
                </div>
              )}
              <span className="text-[10px] font-mono text-cyan-400 mt-2 font-bold tracking-wider uppercase">
                Scan with Phone Camera
              </span>
            </div>

            <div className="flex-1 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Instant Mobile Fingerprint & Authorization</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Point your phone camera at this QR code. It opens a browser page on your local Wi-Fi that automatically
                fingerprints your device and adds it to the Authorized Devices table.
              </p>

              {qrInfo?.pairing_url && (
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 block">Direct Local URL:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={qrInfo.pairing_url}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-cyan-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(qrInfo.pairing_url);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                    <a
                      href={qrInfo.pairing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                      title="Open in Browser"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mode 2: Pairing Code */}
        {adbMode === 'pair' && (
          <form onSubmit={handlePairWifiAdb} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Phone IP & Pairing Port</label>
                <input
                  type="text"
                  value={pairingIpPort}
                  onChange={(e) => setPairingIpPort(e.target.value)}
                  placeholder="e.g. 192.168.1.50:42345"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">6-Digit Pairing Code</label>
                <input
                  type="text"
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value)}
                  placeholder="e.g. 748291"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isPairing}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isPairing ? 'Pairing...' : 'Complete Wireless Pairing'}</span>
            </button>
            {pairingMessage && (
              <p className="text-[11px] text-cyan-400 font-mono p-2 rounded bg-slate-950/60 border border-slate-800">
                {pairingMessage}
              </p>
            )}
          </form>
        )}

        {/* Mode 3: Direct Connect */}
        {adbMode === 'connect' && (
          <div className="space-y-3">
            <form onSubmit={handleConnectWifiAdb} className="flex gap-2">
              <input
                type="text"
                value={wifiAdbIp}
                onChange={(e) => setWifiAdbIp(e.target.value)}
                placeholder="e.g. 192.168.1.50:5555"
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="submit"
                disabled={connectingAdb}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{connectingAdb ? 'Connecting...' : 'Connect Port 5555'}</span>
              </button>
            </form>
            {adbConnectMessage && (
              <p className="text-[11px] text-cyan-400 font-mono p-2 rounded bg-slate-950/60 border border-slate-800">
                {adbConnectMessage}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Manual Target IP Entry Section */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 mb-8">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-cyan-400" />
          <span>Add Custom Target IP / Device Manually</span>
        </h4>
        <p className="text-[11px] text-slate-400 mb-3">
          Authorize any reachable smartphone, tablet, or router IP address directly on your local network:
        </p>
        <form onSubmit={handleAddManualTarget} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Device Label (e.g. My Galaxy Phone)"
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <input
            type="text"
            value={manualIp}
            onChange={(e) => setManualIp(e.target.value)}
            placeholder="IP Address (e.g. 192.168.1.50)"
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add & Authorize</span>
          </button>
        </form>
      </div>

      {/* Bottom Sticky Action Bar: Selected Target & Continue to Scan Depth */}
      <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div>
          {selectedDevice ? (
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedDevice.status === 'online' ? 'bg-cyan-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="text-xs text-slate-300">
                Active Audit Target: <strong className="text-white">{selectedDevice.name}</strong>{' '}
                <span className="font-mono text-cyan-400">({selectedDevice.ip_or_serial})</span>
              </span>
              {selectedDevice.status === 'offline' && (
                <span className="ml-2 px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                  <WifiOff className="w-3 h-3 text-rose-400" />
                  <span>TARGET OFFLINE</span>
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-500">
              Select an authorized target from the top table to proceed.
            </span>
          )}
        </div>

        <button
          disabled={!selectedDevice || selectedDevice.status === 'offline'}
          onClick={() => selectedDevice && selectedDevice.status !== 'offline' && onSelectDevice(selectedDevice)}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold tracking-wide transition-all ${
            selectedDevice && selectedDevice.status !== 'offline'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{selectedDevice?.status === 'offline' ? 'Target Offline — Cannot Audit' : 'Continue to Scan Depth'}</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* MODAL: SECURITY AUDIT TARGET PERMISSION GATE                   */}
      {/* ============================================================== */}
      {auditModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl shadow-cyan-950/50 p-6 sm:p-7">
            {/* Close Button */}
            <button
              onClick={() => setAuditModalTarget(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">SECURITY AUDIT: Device Authorization</h3>
                <p className="text-xs text-slate-400">
                  Follow these steps on the device to allow the security auditor to audit your device.
                </p>
              </div>
            </div>

            {/* Target Info Badge */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 mb-5 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white mb-0.5">{auditModalTarget.name}</h4>
                <div className="text-[11px] text-slate-400 font-mono">
                  IP: <span className="text-cyan-400">{auditModalTarget.ip_or_serial}</span> • {auditModalTarget.vendor}
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
                <Bell className="w-3 h-3 text-cyan-400" />
                <span>{notifying ? 'Beaconing...' : 'Notification Dispatched'}</span>
              </div>
            </div>

            {/* Notification Beacon Status Alert */}
            {notificationStatus && (
              <div className="mb-5 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/60 text-[11px] text-cyan-300 flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 shrink-0" />
                <span>{notificationStatus}</span>
              </div>
            )}

            {/* Step-by-Step Authorization Instructions */}
            <div className="space-y-3.5 mb-6 text-xs text-slate-300">
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </span>
                <div className="flex-1">
                  <h5 className="font-bold text-white mb-1">Open Device Audit Portal / Scan QR</h5>
                  <p className="text-slate-400 leading-relaxed mb-2">
                    On your device ({auditModalTarget.name}), scan this QR code or navigate to:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={qrInfo?.pairing_url || `http://${qrInfo?.local_ip || '192.168.1.100'}:8765/mobile-audit`}
                      className="flex-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-cyan-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (qrInfo?.pairing_url) {
                          navigator.clipboard.writeText(qrInfo.pairing_url);
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h5 className="font-bold text-white mb-1">Grant Device Permissions</h5>
                  <p className="text-slate-400 leading-relaxed">
                    On the opened screen, tap <strong className="text-emerald-400">ALLOW AUDIT & CONNECT</strong> to permit
                    read-only storage baseline, network socket verification, and sensor telemetry.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <h5 className="font-bold text-white mb-1">Enable Deep Audit Mode (Optional)</h5>
                  <p className="text-slate-400 leading-relaxed">
                    For root & kernel-level CVE auditing, turn on <strong>Wireless Debugging</strong> in{' '}
                    <strong>Developer Options</strong> (or keep USB plugged in).
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResendNotification}
                disabled={notifying}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-bold transition-colors cursor-pointer w-full sm:w-auto justify-center"
              >
                <Bell className="w-3.5 h-3.5 text-cyan-400" />
                <span>{notifying ? 'Pinging...' : 'Re-send Notification Ping'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmAuthorization(auditModalTarget)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer w-full sm:w-auto justify-center"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Authorized & Add to Audit Table</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceSelect;
