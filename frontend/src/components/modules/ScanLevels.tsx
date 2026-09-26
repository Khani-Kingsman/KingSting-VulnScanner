import React, { useState, useEffect } from 'react';
import type { TargetDevice, ScanDepth, CheckStep, ScanModule } from '../../types';
import { getScanSteps } from '../../services/api';
import { Zap, ShieldAlert, ChevronLeft, Check, ListChecks, Play, AlertCircle } from 'lucide-react';

interface ScanLevelsProps {
  module: ScanModule;
  target: TargetDevice;
  onBack: () => void;
  onStartConsent: (depth: ScanDepth) => void;
}

export const ScanLevels: React.FC<ScanLevelsProps> = ({
  module,
  target,
  onBack,
  onStartConsent
}) => {
  const [selectedDepth, setSelectedDepth] = useState<ScanDepth>('deep');
  const [plannedSteps, setPlannedSteps] = useState<CheckStep[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);

  useEffect(() => {
    const fetchSteps = async () => {
      setLoadingSteps(true);
      try {
        const steps = await getScanSteps(module, selectedDepth);
        setPlannedSteps(steps);
      } catch (err) {
        console.error('Failed to load steps:', err);
      } finally {
        setLoadingSteps(false);
      }
    };
    fetchSteps();
  }, [module, selectedDepth]);

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      {/* Top Breadcrumb & Back */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Target Selection</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
          <span className="text-slate-500">Target:</span>
          <span className="font-semibold text-cyan-300">{target.name}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">{target.ip_or_serial}</span>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Select Audit Depth</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Choose between a rapid surface hygiene check and an exhaustive deep-spectrum vulnerability audit.
        </p>
      </div>

      {/* Depth Tier Cards - 2 Options: Quick vs Exhaustive Deep */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Quick Check */}
        <div
          onClick={() => setSelectedDepth('quick')}
          className={`p-6 rounded-2xl border transition-all cursor-pointer relative ${
            selectedDepth === 'quick'
              ? 'bg-slate-850 border-cyan-500 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-500/50'
              : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
              ~6 Seconds
            </span>
          </div>

          <h3 className="text-lg font-bold text-white mb-1">Quick Hygiene Check</h3>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Surface-level inspection of device connectivity, OS version, primary security patch date, and root binaries.
          </p>

          <div className="text-[11px] text-slate-400 space-y-2 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-slate-300">
              <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Network Reachability & Latency Probe</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>OS Build & Security Patch Baseline</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Root Privilege & su Binary Audit</span>
            </div>
          </div>
        </div>

        {/* Exhaustive Deep A-Z */}
        <div
          onClick={() => setSelectedDepth('deep')}
          className={`p-6 rounded-2xl border transition-all cursor-pointer relative ${
            selectedDepth === 'deep'
              ? 'bg-slate-850 border-purple-500 shadow-xl shadow-purple-950/40 ring-1 ring-purple-500/50'
              : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
          }`}
        >
          <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-[10px] font-bold text-white uppercase tracking-wider shadow-md">
            Recommended
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-purple-950/60 text-purple-300 border border-purple-800">
              Exhaustive A–Z Audit
            </span>
          </div>

          <h3 className="text-lg font-bold text-white mb-1">Exhaustive Deep (A–Z) Audit</h3>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Full-spectrum inspection: multi-port socket sweep (ADB/Termux/Shells), SELinux enforcement, cleartext HTTP, and comprehensive Android CVE correlation.
          </p>

          <div className="text-[11px] text-slate-400 space-y-2 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-slate-300">
              <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>All Quick Baseline Controls</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Multi-Port Socket & Listening Daemon Sweep</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Cleartext HTTP & Network Security Config</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>SELinux Mandatory Access & Container Sandbox</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>NVD Android Security Bulletins & Known CVE Mapping</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Active Controls Checklist Preview */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 mb-8">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Active Control Blueprint ({plannedSteps.length} Controls Scheduled)
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">
            Mode: <strong className="text-slate-300 uppercase">{selectedDepth}</strong>
          </span>
        </div>

        {loadingSteps ? (
          <div className="text-center py-6 text-xs text-slate-500">Loading planned control list...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plannedSteps.map((step, idx) => (
              <div
                key={step.id}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/40 border border-slate-850"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 text-[10px] font-bold mt-0.5">
                  {idx + 1}
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-slate-200">{step.name}</h5>
                  <p className="text-[11px] text-slate-400 leading-tight">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs text-amber-400/90">
          <AlertCircle className="w-4 h-4" />
          <span>Consent gate will trigger before any audit execution begins.</span>
        </div>

        <button
          onClick={() => onStartConsent(selectedDepth)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Proceed to Authorization & Scan</span>
        </button>
      </div>
    </div>
  );
};
