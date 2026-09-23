import React, { useState, useEffect } from 'react';
import type { TargetDevice, ScanModule } from '../../types';
import { getDevices } from '../../services/api';
import { Smartphone, Wifi, Apple, Usb, Radio, RefreshCw, CheckCircle, ChevronLeft, Search, ShieldCheck } from 'lucide-react';

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
  const [mode, setMode] = useState<'autodetect' | 'manual'>('autodetect');
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

  const fetchDeviceList = async () => {
    setLoading(true);
    try {
      const data = await getDevices(module);
      setDevices(data);
      if (data.length > 0 && !selectedDevice) {
        setSelectedDevice(data[0]);
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

  const triggerAutoDetect = () => {
    setIsAutoDetecting(true);
    setTimeout(() => {
      setIsAutoDetecting(false);
      fetchDeviceList();
    }, 1400);
  };

  const getModuleIcon = () => {
    if (module === 'android') return <Smartphone className="w-5 h-5 text-emerald-400" />;
    if (module === 'wireless') return <Wifi className="w-5 h-5 text-cyan-400" />;
    return <Apple className="w-5 h-5 text-blue-400" />;
  };

  const getModuleTitle = () => {
    if (module === 'android') return 'Android Device Discovery';
    if (module === 'wireless') return 'Wireless Network & Subnet Discovery';
    return 'iOS / iPadOS Device Discovery';
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      {/* Top Breadcrumb & Back */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Modules</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
          {getModuleIcon()}
          <span className="font-semibold text-slate-200 capitalize">{module} Target Selection</span>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{getModuleTitle()}</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          {module === 'wireless'
            ? 'Discover local access points, gateway subnets, and active network interfaces.'
            : 'Locate connected physical or virtual endpoints via USB cable or local wireless debugging.'}
        </p>
      </div>

      {/* Discovery Mode Switcher */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex p-1 rounded-xl bg-slate-900/90 border border-slate-800">
          <button
            onClick={() => setMode('autodetect')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'autodetect'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Auto-Detect ({module === 'android' ? 'ADB Daemon' : module === 'wireless' ? 'Interface Sniffer' : 'USB / Pairing'})</span>
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'manual'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Manual Pick from List</span>
          </button>
        </div>
      </div>

      {/* Auto-detect scan trigger card (if in autodetect mode) */}
      {mode === 'autodetect' && (
        <div className="mb-6 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h4 className="text-sm font-semibold text-white">Hardware Interrogation Engine</h4>
              <p className="text-xs text-slate-400">
                {module === 'android'
                  ? 'Listening for ADB USB endpoints and active TCP 5555 daemons.'
                  : module === 'wireless'
                  ? 'Querying network adapter for broadcast SSIDs and gateway ARP tables.'
                  : 'Probing Apple MobileDeviceUSB and Wi-Fi sync pairings.'}
              </p>
            </div>
            <button
              onClick={triggerAutoDetect}
              disabled={isAutoDetecting}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isAutoDetecting
                  ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAutoDetecting ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isAutoDetecting ? 'Scanning Ports...' : 'Re-scan Devices'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Device List */}
      <div className="space-y-3 mb-8">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Probing local device interfaces...</div>
        ) : devices.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No devices discovered. Ensure target is connected and authorized.
          </div>
        ) : (
          devices.map((device) => {
            const isSelected = selectedDevice?.id === device.id;
            return (
              <div
                key={device.id}
                onClick={() => setSelectedDevice(device)}
                className={`flex items-center justify-between p-4 sm:p-5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-850/90 border-cyan-500/80 shadow-lg shadow-cyan-950/30'
                    : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800'
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                        {device.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>
                        <strong className="text-slate-500">ID / IP:</strong> {device.ip_or_serial}
                      </span>
                      {device.os_version && (
                        <span>
                          <strong className="text-slate-500">OS:</strong> {device.os_version}
                        </span>
                      )}
                      <span>
                        <strong className="text-slate-500">Mode:</strong> {device.connection_mode.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500 text-white'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-800">
        <p className="text-xs text-slate-500">
          Target validation is ready. Next step: configure scan depth level.
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
