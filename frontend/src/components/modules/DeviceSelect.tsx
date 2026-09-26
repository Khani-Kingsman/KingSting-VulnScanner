import React, { useState, useEffect } from 'react';
import type { TargetDevice, ScanModule } from '../../types';
import { getDevices, pairWifiAdb, connectWifiAdb, getMobileQrCode, deleteDevice, clearOfflineDevices } from '../../services/api';
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
  PlugZap,
  HelpCircle,
  Plus,
  Send,
  KeyRound,
  Network,
  Laptop,
  QrCode,
  Copy,
  ExternalLink,
  Check,
  Trash2,
  WifiOff
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
  const [selectedDevice, setSelectedDevice] = useState<TargetDevice | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Wireless Android Mode Selection: 'qr' (QR code onboarding) vs 'pair' (pairing code) vs 'connect' (direct ip:port)
  const [adbMode, setAdbMode] = useState<'qr' | 'pair' | 'connect'>('qr');

  // QR Code State
  const [qrInfo, setQrInfo] = useState<{ qr_image: string; pairing_url: string; local_ip: string } | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Wireless ADB Pairing State
  const [pairingIpPort, setPairingIpPort] = useState('192.168.100.54:');
  const [pairingCode, setPairingCode] = useState('');
  const [isPairing, setIsPairing] = useState(false);
  const [pairingMessage, setPairingMessage] = useState<string | null>(null);

  // Wireless ADB Direct Connect State
  const [wifiAdbIp, setWifiAdbIp] = useState('192.168.100.54:5555');
  const [connectingAdb, setConnectingAdb] = useState(false);
  const [adbConnectMessage, setAdbConnectMessage] = useState<string | null>(null);

  // Manual target entry
  const [manualIp, setManualIp] = useState('');
  const [manualName, setManualName] = useState('');

  const fetchDeviceList = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getDevices(module);
      setDevices(data);
      if (data.length > 0) {
        setSelectedDevice((prev) => {
          if (prev && data.find((d) => d.id === prev.id)) return prev;
          // Prioritize newly registered QR mobile
          const qrDev = data.find((d) => d.connection_mode === 'wireless_qr');
          return qrDev || data[0];
        });
      } else {
        setSelectedDevice(null);
      }
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Fetch QR Code for Android Module
  useEffect(() => {
    if (module === 'android') {
      setLoadingQr(true);
      getMobileQrCode()
        .then((res) => setQrInfo(res))
        .catch((err) => console.error('Failed to generate QR:', err))
        .finally(() => setLoadingQr(false));
    }
  }, [module]);

  // Periodic background refresh to detect newly scanned QR phones immediately!
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

    setDevices((prev) => [customDevice, ...prev]);
    setSelectedDevice(customDevice);
    setManualIp('');
    setManualName('');
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
    if (nameLower.includes('s10') || nameLower.includes('galaxy') || nameLower.includes('smartphone') || nameLower.includes('mobile') || nameLower.includes('phone') || nameLower.includes('android')) {
      return <Smartphone className="w-5 h-5 text-emerald-400" />;
    }
    if (nameLower.includes('iphone') || nameLower.includes('ipad') || nameLower.includes('apple')) {
      return <Apple className="w-5 h-5 text-blue-400" />;
    }
    if (nameLower.includes('host') || nameLower.includes('laptop') || nameLower.includes('pc')) {
      return <Laptop className="w-5 h-5 text-slate-300" />;
    }
    return <Network className="w-5 h-5 text-cyan-400" />;
  };

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
            : 'iOS Hardware & Interface Discovery'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          {module === 'android'
            ? 'Connect via USB cable or completely wirelessly using Android 11+ Wireless Debugging & Pairing Code.'
            : module === 'wireless'
            ? 'Discover all active devices connected to your local Wi-Fi subnet (smartphones, routers, endpoints) and audit authorized targets.'
            : 'Probing Apple MobileDeviceUSB interfaces and network endpoints.'}
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
              {module === 'wireless' ? 'Subnet ARP & Host Discovery Active' : 'Live Hardware Scanner Active'}
            </h4>
            <p className="text-[11px] text-slate-400">
              {devices.length > 0
                ? `${devices.length} real target(s) detected and validated on interface`
                : 'No hardware target currently detected on interface'}
            </p>
          </div>
        </div>

        <button
          onClick={triggerScan}
          disabled={isScanning || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-cyan-400' : ''}`} />
          <span>{isScanning ? 'Scanning Interfaces...' : module === 'wireless' ? 'Re-scan Subnet Devices' : 'Re-scan Hardware'}</span>
        </button>
      </div>

      {/* Cable-Free Wireless Debugging Section (Prominently Featured in Android Module) */}
      {module === 'android' && (
        <div className="mb-8 p-6 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-xl shadow-emerald-950/20">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Connect Android Phone Wirelessly (No USB Needed)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">100% Cable-Free</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Connect your Samsung, Pixel, Xiaomi, or other Android phone over your local Wi-Fi.
                </p>
              </div>
            </div>

            {/* Mode Toggle Tabs */}
            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setAdbMode('qr')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  adbMode === 'qr' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-950/50' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan QR Code (Cable-Free)</span>
              </button>
              <button
                type="button"
                onClick={() => setAdbMode('pair')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  adbMode === 'pair' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-950/50' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Pair with 6-Digit Code</span>
              </button>
              <button
                type="button"
                onClick={() => setAdbMode('connect')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  adbMode === 'connect' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-950/50' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Direct Connect (Port)</span>
              </button>
            </div>
          </div>

          {/* Mode 1: Instant Wireless QR Code Onboarding */}
          {adbMode === 'qr' && (
            <div className="p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-cyan-500/25">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* QR Code Canvas Frame */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950 border border-cyan-500/40 shadow-xl shadow-cyan-950/60 shrink-0">
                  {loadingQr ? (
                    <div className="w-44 h-44 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                      <span>Generating QR...</span>
                    </div>
                  ) : qrInfo?.qr_image ? (
                    <img
                      src={qrInfo.qr_image}
                      alt="Mobile Pairing QR Code"
                      className="w-44 h-44 rounded-xl border border-cyan-500/20"
                    />
                  ) : (
                    <div className="w-44 h-44 flex flex-col items-center justify-center text-xs text-rose-400 p-2 text-center">
                      Failed to render QR Code. Ensure backend is running.
                    </div>
                  )}
                  <span className="text-[10px] font-mono text-cyan-400 mt-2 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Scan with Mobile Camera</span>
                  </span>
                </div>

                {/* Instructions & Telemetry Guide */}
                <div className="space-y-3 flex-1 text-xs">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      <span>Zero-Cable Mobile Fingerprint & Link</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">RECOMMENDED</span>
                    </h4>
                    <p className="text-slate-400 leading-relaxed text-xs">
                      Point your phone's camera, QR scanner, or browser at the QR code. The mobile node will automatically extract and register your device's complete hardware profile:
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Device Model & OEM</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Android OS Version</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Hardware & WebGL GPU</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Local IPv4 Address</span>
                    </div>
                  </div>

                  {/* Manual URL Link */}
                  {qrInfo?.pairing_url && (
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <span className="text-slate-500 text-[11px]">Direct Link:</span>
                      <code className="px-2.5 py-1 rounded bg-slate-900 text-cyan-300 font-mono text-[11px] border border-slate-800">
                        {qrInfo.pairing_url}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(qrInfo.pairing_url);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 1500);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 cursor-pointer transition-colors"
                      >
                        {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
                        <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                      </button>
                      <a
                        href={qrInfo.pairing_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-cyan-400" />
                        <span>Open in Tab</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick-fill Helper for Detected Subnet Devices */}
          {adbMode !== 'qr' && (
            <div className="mb-4 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">
                Quick IP Fill from local Wi-Fi:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {devices.filter((d) => d.ip_or_serial && d.ip_or_serial.includes('.')).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setPairingIpPort(`${d.ip_or_serial}:`);
                      setWifiAdbIp(`${d.ip_or_serial}:5555`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/50 text-[11px] font-mono cursor-pointer transition-colors"
                  >
                    {d.name.replace(/\s*\(.*?\)\s*/g, '')} ({d.ip_or_serial})
                  </button>
                ))}
                {devices.filter((d) => d.ip_or_serial && d.ip_or_serial.includes('.')).length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPairingIpPort('192.168.100.54:');
                      setWifiAdbIp('192.168.100.54:5555');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/50 text-[11px] font-mono cursor-pointer transition-colors"
                  >
                    Khani-s-S10 (192.168.100.54)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Mode 2: Pair Android 11+ with 6-digit Code */}
          {adbMode === 'pair' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs text-slate-300 space-y-1.5">
                <span className="font-bold text-cyan-300 block mb-1">Android 11+ Wireless Pairing Steps:</span>
                <div>1. On your phone: <strong>Settings</strong> &rarr; <strong>Developer Options</strong> &rarr; enable <strong>Wireless debugging</strong>.</div>
                <div>2. Tap <strong>"Pair device with pairing code"</strong>. Note the <strong>IP address & Port</strong> and <strong>Wi-Fi pairing code</strong> shown in the popup.</div>
                <div>3. Enter both below and click <strong>Pair Device Wirelessly</strong>:</div>
              </div>

              <form onSubmit={handlePairWifiAdb} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Pairing IP & Port</label>
                  <input
                    type="text"
                    value={pairingIpPort}
                    onChange={(e) => setPairingIpPort(e.target.value)}
                    placeholder="e.g. 192.168.100.31:37281"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">6-Digit Pairing Code</label>
                  <input
                    type="text"
                    value={pairingCode}
                    onChange={(e) => setPairingCode(e.target.value)}
                    placeholder="e.g. 123456"
                    maxLength={8}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono text-center tracking-widest font-bold"
                  />
                </div>
                <div className="sm:col-span-3 flex items-end">
                  <button
                    type="submit"
                    disabled={isPairing}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-emerald-950/40"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isPairing ? 'Pairing...' : 'Pair Device'}</span>
                  </button>
                </div>
              </form>
              {pairingMessage && (
                <p className="text-[11px] text-emerald-400 mt-2 font-mono p-2 rounded bg-slate-950/60 border border-slate-800">
                  {pairingMessage}
                </p>
              )}
            </div>
          )}

          {/* Mode 3: Direct Connect (Port 5555 or existing paired port) */}
          {adbMode === 'connect' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400">
                Connect directly if port 5555 is open or if previously paired with this machine:
              </p>
              <form onSubmit={handleConnectWifiAdb} className="flex gap-2">
                <input
                  type="text"
                  value={wifiAdbIp}
                  onChange={(e) => setWifiAdbIp(e.target.value)}
                  placeholder="e.g. 192.168.100.31:5555"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={connectingAdb}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{connectingAdb ? 'Connecting...' : 'Connect'}</span>
                </button>
              </form>
              {adbConnectMessage && (
                <p className="text-[11px] text-cyan-400 mt-2 font-mono p-2 rounded bg-slate-950/60 border border-slate-800">
                  {adbConnectMessage}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Discovered Device Cards List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span>Interrogating real network interfaces and subnet ARP tables...</span>
        </div>
      ) : devices.length > 0 ? (
        <div className="space-y-3 mb-8">
          <div className="px-1 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>
              {module === 'wireless' ? `Discovered Wi-Fi Devices (${devices.length})` : `Detected Real Targets (${devices.length})`}
            </span>
            <div className="flex items-center gap-3">
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
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-[11px] font-semibold text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                title="Remove all unreachable / offline devices from list"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Clear Offline</span>
              </button>
              <span className="text-[10px] text-emerald-400 font-medium">Ready for Audit Authorization</span>
            </div>
          </div>

          {devices.map((device) => {
            const isSelected = selectedDevice?.id === device.id;
            return (
              <div
                key={device.id}
                onClick={() => setSelectedDevice(device)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-slate-850 border-cyan-500 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center justify-center w-11 h-11 rounded-xl border ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/40'
                        : 'bg-slate-800/80 border-slate-700'
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
                        <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
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
                        <strong className="text-slate-500">Target IP / ID:</strong>{' '}
                        <span className="font-mono text-cyan-300">{device.ip_or_serial}</span>
                      </span>
                      {device.os_version && (
                        <span>
                          <strong className="text-slate-500">Details:</strong> {device.os_version}
                        </span>
                      )}
                      <span>
                        <strong className="text-slate-500">Mode:</strong> {device.connection_mode.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    title="Delete / Forget Device"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete device '${device.name}' (${device.ip_or_serial}) from scanner?`)) {
                        try {
                          await deleteDevice(device.ip_or_serial);
                          setDevices((prev) => prev.filter((d) => d.id !== device.id && d.ip_or_serial !== device.ip_or_serial));
                          if (selectedDevice?.id === device.id) {
                            setSelectedDevice(null);
                          }
                        } catch (err) {
                          console.error('Failed to delete device:', err);
                        }
                      }
                    }}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-700/60 transition-colors cursor-pointer"
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
        /* Empty State with USB connection guidance for Android / iOS */
        <div className="mb-8 p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <PlugZap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                {module === 'android'
                  ? 'No Android Device Connected via USB or Wireless ADB'
                  : module === 'ios'
                  ? 'No iOS Device Connected via USB'
                  : 'No Wireless Network Interface Detected'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {module === 'android'
                  ? 'Use the Wireless Debugging box above to connect without cables, or follow the physical cable steps below:'
                  : module === 'ios'
                  ? 'No Apple iPhone or iPad was detected on the USB controller. Connect an iOS device via cable, unlock the screen, and tap "Trust This Computer".'
                  : 'Ensure your WiFi adapter is powered on and connected to an access point.'}
              </p>
            </div>
          </div>

          {/* Android USB Connection Steps */}
          {module === 'android' && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-2.5 text-xs text-slate-300">
              <h4 className="font-bold text-cyan-300 text-xs mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>Physical USB Cable Connection Guide:</span>
              </h4>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                <span>Connect your Android phone to this PC using a USB data cable.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                <span>On your phone: Go to <strong>Settings</strong> &rarr; <strong>About Phone</strong> &rarr; Tap <strong>Build Number</strong> 7 times to enable Developer Mode.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                <span>Go to <strong>Settings</strong> &rarr; <strong>Developer Options</strong> &rarr; Turn ON <strong>USB Debugging</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">4</span>
                <span>Unlock your phone screen and tap <strong>Allow USB Debugging</strong> when the prompt appears.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">5</span>
                <span>Click <strong>Re-scan Hardware</strong> above to detect your device immediately.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Target IP Entry Section (Always Available) */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 mb-8">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-cyan-400" />
          <span>Add Custom Target IP / Subnet Manually</span>
        </h4>
        <p className="text-[11px] text-slate-400 mb-3">
          Audit any reachable device, smartphone, or router IP address directly on your local network:
        </p>
        <form onSubmit={handleAddManualTarget} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Device Label (e.g. My Phone)"
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <input
            type="text"
            value={manualIp}
            onChange={(e) => setManualIp(e.target.value)}
            placeholder="IP Address (e.g. 192.168.100.50)"
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Target</span>
          </button>
        </form>
      </div>

      {/* Bottom Sticky Action Bar: Selected Target & Continue to Scan Depth */}
      <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div>
          {selectedDevice ? (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${selectedDevice.status === 'online' ? 'bg-cyan-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-xs text-slate-300">
                Selected Target: <strong className="text-white">{selectedDevice.name}</strong>{' '}
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
            <span className="text-xs text-slate-500">Select or add a real target to proceed.</span>
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
          <ShieldCheck className="w-4 h-4" />
          <span>{selectedDevice?.status === 'offline' ? 'Target Offline — Cannot Audit' : 'Continue to Scan Depth'}</span>
        </button>
      </div>
    </div>
  );
};

export default DeviceSelect;
