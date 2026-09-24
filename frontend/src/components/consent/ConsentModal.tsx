import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  targetName: string;
  targetIp?: string;
  moduleName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  targetName,
  targetIp,
  moduleName,
  onConfirm,
  onCancel
}) => {
  const [ownsDevice, setOwnsDevice] = useState(false);
  const [noExploits, setNoExploits] = useState(false);
  const [auditLogConsent, setAuditLogConsent] = useState(false);

  if (!isOpen) return null;

  const canProceed = ownsDevice && noExploits && auditLogConsent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-cyan-950/50 p-6 sm:p-8">
        
        {/* Permission Notification Banner */}
        <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
          <div>
            <strong className="block text-amber-200 font-bold uppercase tracking-wider text-[11px]">Audit Permission Notification</strong>
            <span>Do you allow this security audit to start on the selected device? If not allowed, the audit will be immediately aborted.</span>
          </div>
        </div>

        {/* Header Icon */}
        <div className="flex items-center gap-4 mb-5 pb-4 border-b border-slate-800">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Security Audit Authorization Gate
            </h2>
            <p className="text-xs text-slate-400">
              Verify legal ownership and affirmative consent before socket interrogation
            </p>
          </div>
        </div>

        {/* Target summary badge */}
        <div className="mb-5 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Target Device:</span>
            <span className="font-bold text-white">{targetName}</span>
          </div>
          {targetIp && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">IP / Identifier:</span>
              <span className="font-mono text-cyan-400 font-semibold">{targetIp}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Audit Module:</span>
            <span className="font-semibold text-slate-300 uppercase">{moduleName}</span>
          </div>
        </div>

        {/* Verification Checkboxes */}
        <div className="space-y-3 mb-6 text-xs text-slate-300">
          <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={ownsDevice}
              onChange={(e) => setOwnsDevice(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-slate-900"
            />
            <span>
              <strong className="text-white block mb-0.5">Asset Ownership & Permission Affirmation</strong>
              I solemnly affirm that I am the legal owner of this device or have explicit permission to audit its security configuration.
            </span>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={noExploits}
              onChange={(e) => setNoExploits(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-slate-900"
            />
            <span>
              <strong className="text-white block mb-0.5">Defensive Detection & Reporting Only</strong>
              No exploitation, brute-forcing, or weaponized payloads will take place. Only non-intrusive service and vulnerability checks.
            </span>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={auditLogConsent}
              onChange={(e) => setAuditLogConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-slate-900"
            />
            <span>
              <strong className="text-white block mb-0.5">Immutable Audit Trail Record</strong>
              Authorize recording this audit event and compliance hash into the local SQLite database.
            </span>
          </label>
        </div>

        {/* Action Buttons: Allow or Do Not Allow */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-900/60 bg-rose-950/30 text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>Do Not Allow (Abort)</span>
          </button>

          <button
            type="button"
            disabled={!canProceed}
            onClick={onConfirm}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
              canProceed
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Allow & Start Audit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
