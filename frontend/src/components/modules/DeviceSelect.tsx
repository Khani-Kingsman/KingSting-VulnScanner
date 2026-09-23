import React, { useState, useEffect } from 'react';
import type { TargetDevice, ScanModule } from '../../types';
import { getDevices } from '../../services/api';
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
  Send
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

  // Wireless ADB & Manual IP State
  const [wifiAdbIp, setWifiAdbIp] = useState('');
  const [connectingAdb, setConnectingAdb] = useState(false);
  const [adbConnectMessage, setAdbConnectMessage] = useState<string | null>(null);

  // Manual target entry
  const [manualIp, setManualIp] = useState('');
  const [manualName, setManualName] = useState('');

  const fetchDeviceList = async () => {
    setLoading(true);
    try {
      const data = await getDevices(module);
      setDevices(data);
      if (data.length > 0) {
        setSelectedDevice(data[0]);
      } else {
        setSelectedDevice(null);
      }
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceList();
  }, [module]);

  const triggerScan = () => {
    setIsScanning(true);
    fetchDeviceList().finally(() => {
      setTimeout(() => setIsScanning(false), 800);
    });
  };

  const handleConnectWifiAdb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wifiAdbIp.trim()) return;
    setConnectingAdb(true);
    setAdbConnectMessage('Attempting wireless ADB pairing...');

    try {
      const res = await fetch('http://127.0.0.1:8765/api/devices/connect-wifi-adb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip_port: wifiAdbIp.trim() })
      });
      const data = await res.json();
      setAdbConnectMessage(data.message || 'Connection attempt finished');
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

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
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
            ? 'Live WiFi & Subnet Topology'
            : 'iOS Hardware & Interface Discovery'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          {module === 'android'
            ? 'Probing connected USB buses via ADB and listening for active wireless debug endpoints.'
            : module === 'wireless'
            ? 'Interrogating your system wireless adapter for real active SSIDs, ciphers, and local subnet routing.'
            : 'Probing Apple MobileDeviceUSB interfaces and network endpoints.'}
        </p>
      </div>

      {/* Action Bar: Re-Scan Button */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/70 border border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Live Hardware Scanner Active</h4>
            <p className="text-[11px] text-slate-400">
              {devices.length > 0
                ? `${devices.length} real target(s) detected and validated`
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
          <span>{isScanning ? 'Scanning Interfaces...' : 'Re-scan Hardware'}</span>
        </button>
      </div>

      {/* Device List or Empty State */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Querying real system hardware bus...</div>
      ) : devices.length > 0 ? (
        <div className="space-y-3 mb-8">
          <div className="px-1 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Detected Real Targets ({devices.length})</span>
            <span className="text-[10px] text-emerald-400 font-medium">Ready for Audit</span>
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
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}
                  >
                    {device.connection_mode === 'usb' ? (
                      <Usb className="w-5 h-5" />
                    ) : (
                      <Wifi className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-white">{device.name}</h4>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          device.status === 'online'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border-amber-800'
                        }`}
                      >
                        {device.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>
                        <strong className="text-slate-500">Target / ID:</strong> {device.ip_or_serial}
                      </span>
                      {device.os_version && (
                        <span>
                          <strong className="text-slate-500">Config:</strong> {device.os_version}
                        </span>
                      )}
                      <span>
                        <strong className="text-slate-500">Mode:</strong> {device.connection_mode.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected ? 'border-cyan-400 bg-cyan-500 text-white' : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State with Actionable Guidance */
        <div className="mb-8 p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <PlugZap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                {module === 'android'
                  ? 'No Android Device Connected via USB'
                  : module === 'ios'
                  ? 'No iOS Device Connected via USB'
                  : 'No Wireless Network Interface Detected'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {module === 'android'
                  ? 'The system ADB daemon searched your USB controllers and found no active device. Follow the real setup steps below to connect your Android phone:'
                  : module === 'ios'
                  ? 'No Apple iPhone or iPad was detected on the USB controller. Connect an iOS device via cable, unlock the screen, and tap "Trust This Computer".'
                  : 'Ensure your WiFi adapter is powered on and connected to an access point.'}
              </p>
            </div>
          </div>

          {/* Android USB Connection Steps */}
          {module === 'android' && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 mb-6 space-y-2.5 text-xs text-slate-300">
              <h4 className="font-bold text-cyan-300 text-xs mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>How to connect your physical Android phone:</span>
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

          {/* Option B: Wireless ADB Connection */}
          {module === 'android' && (
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <h4 className="text-xs font-bold text-slate-200 mb-2">
                Or Connect via Wireless ADB (IP:Port)
              </h4>
              <p className="text-[11px] text-slate-400 mb-3">
                If your Android phone supports Wireless Debugging on your local WiFi (e.g., <code>192.168.100.X:5555</code>):
              </p>
              <form onSubmit={handleConnectWifiAdb} className="flex gap-2">
                <input
                  type="text"
                  value={wifiAdbIp}
                  onChange={(e) => setWifiAdbIp(e.target.value)}
                  placeholder="e.g. 192.168.100.50:5555"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={connectingAdb}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{connectingAdb ? 'Connecting...' : 'Connect'}</span>
                </button>
              </form>
              {adbConnectMessage && (
                <p className="text-[11px] text-cyan-400 mt-2 font-mono">{adbConnectMessage}</p>
              )}
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
        <form onSubmit={handleAddManualTarget} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-4">
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Device Label (e.g. My Phone)"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="sm:col-span-5">
            <input
              type="text"
              value={manualIp}
              onChange={(e) => setManualIp(e.target.value)}
              placeholder="IP Address (e.g. 192.168.100.50)"
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-400 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Target</span>
            </button>
          </div>
        </form>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-800">
        <p className="text-xs text-slate-500">
          {selectedDevice
            ? `Target selected: ${selectedDevice.name}`
            : 'Select or add a real target to proceed.'}
        </p>

        <button
          disabled={!selectedDevice}
          onClick={() => selectedDevice && onSelectDevice(selectedDevice)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
            selectedDevice
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Continue to Scan Depth</span>
        </button>
      </div>
    </div>
  );
};
