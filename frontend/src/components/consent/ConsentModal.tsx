import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  targetName: string;
  moduleName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  targetName,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-cyan-950/50 p-6 sm:p-8">
        {/* Header Icon */}
        <div className="flex items-center gap-4 mb-5 pb-4 border-b border-slate-800">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Mandatory Audit Authorization
            </h2>
            <p className="text-xs text-slate-400">
              Regulatory Compliance & Defensive Testing Agreement (§2 Ground Rules)
            </p>
          </div>
        </div>

        {/* Target summary badge */}
        <div className="mb-5 p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-medium">Target Asset: </span>
            <span className="font-semibold text-cyan-300">{targetName}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Module: </span>
            <span className="font-semibold text-slate-300 uppercase">{moduleName}</span>
          </div>
        </div>

        {/* Verification Checkboxes */}
        <div className="space-y-3.5 mb-6 text-xs text-slate-300">
          <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={ownsDevice}
              onChange={(e) => setOwnsDevice(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-slate-900"
            />
            <span>
              <strong className="text-white block mb-0.5">Asset Ownership & Authorization (§2.1)</strong>
              I solemnly affirm that I am the legal owner of this device or have obtained explicit written consent to test its security configuration as part of an authorized BYOD/IT audit program.
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
              <strong className="text-white block mb-0.5">Defensive Detection & Reporting Only (§2.2)</strong>
              I acknowledge that this suite operates solely for configuration review and CVE identification. No payload delivery, authentication bypass, or weaponized exploitation will take place.
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
              <strong className="text-white block mb-0.5">Immutable Audit Trail Logging (§2.4)</strong>
              I authorize recording this scan's timestamp, target identifier, auditor identity, and cryptographic audit hash to the local compliance database.
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            Cancel Audit
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
            <span>Confirm & Authorize Scan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
