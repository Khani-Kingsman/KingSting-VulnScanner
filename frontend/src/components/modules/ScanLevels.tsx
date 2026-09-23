import React, { useState, useEffect } from 'react';
import type { TargetDevice, ScanDepth, CheckStep, ScanModule } from '../../types';
import { getScanSteps } from '../../services/api';
import { Zap, Layers, ShieldAlert, ChevronLeft, Check, ListChecks, Play, AlertCircle } from 'lucide-react';

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
  const [selectedDepth, setSelectedDepth] = useState<ScanDepth>('standard');
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
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
          Tailor the scope of defensive inspection from rapid hygiene verification to exhaustive deep-dive audits.
        </p>
      </div>

      {/* Depth Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* Quick Check */}
        <div
          onClick={() => setSelectedDepth('quick')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
            selectedDepth === 'quick'
              ? 'bg-slate-850 border-cyan-500 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-500/50'
              : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
              ~6 Seconds
            </span>
          </div>

          <h3 className="text-base font-bold text-white mb-1">Quick Check</h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Surface-level inspection of OS version, primary security patch date, and dangerous open debug toggles.
          </p>

          <div className="text-[11px] text-slate-400 space-y-1.5 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              <span>OS Build & Kernel Baseline</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              <span>Basic Storage Encryption State</span>
            </div>
          </div>
        </div>

        {/* Standard Audit */}
        <div
          onClick={() => setSelectedDepth('standard')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
            selectedDepth === 'standard'
              ? 'bg-slate-850 border-cyan-500 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-500/50'
              : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
          }`}
        >
          <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
            Recommended
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
              ~14 Seconds
            </span>
          </div>

          <h3 className="text-base font-bold text-white mb-1">Standard Audit</h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Adds application permission overreach, open port enumerations, and live public NVD CVE cross-referencing.
          </p>

          <div className="text-[11px] text-slate-400 space-y-1.5 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              <span>All Quick Check Controls</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              <span>App Permission & Sideload Audit</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              <span>Public NVD CVE Vulnerability Lookup</span>
            </div>
          </div>
        </div>

        {/* Deep A-Z */}
        <div
          onClick={() => setSelectedDepth('deep')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
            selectedDepth === 'deep'
              ? 'bg-slate-850 border-cyan-500 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-500/50'
              : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
              ~22 Seconds
            </span>
          </div>

          <h3 className="text-base font-bold text-white mb-1">Deep (A–Z) Audit</h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Full-spectrum sweep: root/jailbreak integrity, certificate trust stores, exposed services, and historical CVE trends.
          </p>

          <div className="text-[11px] text-slate-400 space-y-1.5 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              <span>All Standard Audit Controls</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              <span>Root CA / Trust Store Inspection</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              <span>Device SoC Historical CVE Analytics</span>
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
