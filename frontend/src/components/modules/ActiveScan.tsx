import React, { useState, useEffect, useRef } from 'react';
import type { TargetDevice, ScanDepth, CheckStep, Finding, ScanResult } from '../../types';
import { connectScanWebSocket } from '../../services/api';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Radio,
  Shield,
  ShieldAlert,
  Terminal,
  Flame,
  ChevronLeft
} from 'lucide-react';

interface ActiveScanProps {
  target: TargetDevice;
  depth: ScanDepth;
  onScanFinished: (result: ScanResult) => void;
  onBack?: () => void;
}

export const ActiveScan: React.FC<ActiveScanProps> = ({
  target,
  depth,
  onScanFinished,
  onBack
}) => {
  const [steps, setSteps] = useState<CheckStep[]>([]);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [currentStepDetails, setCurrentStepDetails] = useState<string>('Initializing defensive inspection runtime...');
  const [isCompleted, setIsCompleted] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Connect to WebSocket / events
  useEffect(() => {
    const ws = connectScanWebSocket(
      'active',
      (event) => {
        handleScanEvent(event);
      },
      () => console.log('WebSocket closed'),
      (err) => console.warn('WebSocket fallback:', err)
    );
    socketRef.current = ws;

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const handleScanEvent = (event: any) => {
    if (event.type === 'step_started') {
      setActiveStepId(event.step.id);
      setCurrentStepDetails(`Auditing: ${event.step.name} (${event.step.category})...`);
      setSteps((prev) => {
        const existing = prev.find((s) => s.id === event.step.id);
        if (existing) {
          return prev.map((s) => (s.id === event.step.id ? { ...s, status: 'running' } : s));
        } else {
          return [...prev, { ...event.step, status: 'running' }];
        }
      });
    } else if (event.type === 'finding_discovered') {
      setFindings((prev) => [event.finding, ...prev]);
    } else if (event.type === 'step_completed') {
      setSteps((prev) => {
        const nextSteps = prev.map((s) => (s.id === event.step.id ? event.step : s));
        const completedCount = nextSteps.filter((s) => s.status !== 'pending' && s.status !== 'running').length;
        setProgressPercent(Math.round((completedCount / event.total_steps) * 100));
        return nextSteps;
      });
    } else if (event.type === 'scan_completed') {
      setProgressPercent(100);
      setIsCompleted(true);
      setTimeout(() => {
        onScanFinished(event.result);
      }, 1600);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="w-4 h-4 text-cyan-400 animate-spin" />;
      case 'passed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'failed':
        return <AlertOctagon className="w-4 h-4 text-rose-500" />;
      default:
        return <span className="w-2 h-2 rounded-full bg-slate-700" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-950/80 text-rose-400 border border-rose-800">
            <Flame className="w-3 h-3 text-rose-400" />
            CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-950/80 text-orange-400 border border-orange-800">
            <AlertOctagon className="w-3 h-3 text-orange-400" />
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950/80 text-amber-400 border border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-950/80 text-blue-400 border border-blue-800">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4">
      {/* Active Scan Status Bar */}
      <div className="mb-6 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  {isCompleted ? 'Audit Complete — Finalizing Telemetry' : 'Defensive Audit in Progress'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-950 text-cyan-400 border border-cyan-800">
                  {depth} MODE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Auditing <strong className="text-cyan-300">{target.name}</strong> ({target.ip_or_serial})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {onBack && !isCompleted && (
              <button
                onClick={() => {
                  if (window.confirm("Abort current audit and return to scan levels?")) {
                    onBack();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/80 border border-rose-800/80 text-rose-300 hover:text-white font-semibold transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Cancel & Back</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Elapsed: <strong>{formatTime(elapsedSeconds)}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Risks Identified: <strong className="text-rose-400">{findings.length}</strong></span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5 font-medium">
            <span className="text-slate-400 truncate max-w-lg">{currentStepDetails}</span>
            <span className="text-cyan-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Controls Checklist (Left) & Real-time Risk Board (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Illuminated Controls Checklist */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1 mb-1">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Inspection Control Execution Matrix</span>
            </h4>
            <span className="text-[11px] text-slate-500">Live Telemetry</span>
          </div>

          <div className="space-y-2.5">
            {steps.map((step) => {
              const isActive = activeStepId === step.id;
              return (
                <div
                  key={step.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-slate-850/90 border-cyan-500/80 shadow-md shadow-cyan-950/30'
                      : step.status === 'passed'
                      ? 'bg-slate-900/60 border-slate-800/80'
                      : step.status === 'warning'
                      ? 'bg-slate-900/70 border-amber-900/40'
                      : step.status === 'failed'
                      ? 'bg-slate-900/70 border-rose-900/40'
                      : 'bg-slate-950/40 border-slate-900 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-950 border border-slate-800">
                        {getStepIcon(step.status)}
                      </div>
                      <span className="text-xs font-bold text-white">{step.name}</span>
                    </div>

                    <span className="text-[10px] font-semibold text-slate-500 uppercase">
                      {step.category}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 pl-8 leading-snug">
                    {step.details || step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Running Risk Board (§4.4) */}
        <div className="lg:col-span-5">
          <div className="sticky top-20 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Risk Board
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                {findings.length} Flagged
              </span>
            </div>

            {findings.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                <Shield className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                <p>Auditing controls in real-time...</p>
                <p className="text-[10px] text-slate-600 mt-1">Discovered misconfigurations and CVEs will populate here dynamically.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {findings.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      {getSeverityBadge(f.severity)}
                      <span className="text-[10px] text-slate-500 font-mono">{f.cve_id || f.component}</span>
                    </div>

                    <h5 className="font-bold text-slate-200 mb-1 leading-snug">{f.title}</h5>
                    <p className="text-[11px] text-slate-400 leading-tight mb-2 line-clamp-2">
                      {f.description}
                    </p>

                    <div className="text-[10px] text-cyan-400/90 bg-cyan-950/40 p-2 rounded-lg border border-cyan-900/30">
                      <strong>Remediation:</strong> {f.remediation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
