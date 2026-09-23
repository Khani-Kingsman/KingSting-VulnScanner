import React, { useState, useEffect } from 'react';
import type { AuditEntry } from '../../types';
import { getAuditLogs, getPdfDownloadUrl } from '../../services/api';
import { History, X, Download, Calendar, FileText } from 'lucide-react';

interface AuditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getAuditLogs(50)
        .then((data) => setLogs(data))
        .catch((err) => console.error('Failed to load audit logs:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Compliance Audit Trail & Scan History</h3>
              <p className="text-xs text-slate-400">
                Immutable local SQLite audit log of authorized scan records (§2.4 Compliance)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-855 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-16 text-slate-500 text-sm">Querying SQLite audit log database...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              <FileText className="w-10 h-10 mx-auto text-slate-700 mb-3" />
              <p>No audit records found in local database.</p>
              <p className="text-xs text-slate-600 mt-1">Authorized scans will be recorded here automatically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.scan_id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 transition-all text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-850">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-cyan-400">{log.scan_id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-300">
                        {log.module} • {log.depth}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {log.timestamp}
                      </span>
                      <span>
                        Auditor: <strong className="text-slate-300">{log.authorized_by}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm">{log.target_name}</h4>
                      <p className="text-slate-400 text-[11px]">ID: {log.target_identifier}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Score badge */}
                      <div className="text-center px-3 py-1 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Score</span>
                        <span
                          className={`font-black text-sm ${
                            log.score >= 80 ? 'text-emerald-400' : log.score >= 65 ? 'text-amber-400' : 'text-rose-400'
                          }`}
                        >
                          {log.score}/100
                        </span>
                      </div>

                      {/* Findings count badges */}
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-900">
                          {log.critical_count} Crit
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-orange-950/80 text-orange-300 border border-orange-900">
                          {log.high_count} High
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-900">
                          {log.medium_count} Med
                        </span>
                      </div>

                      {/* PDF download */}
                      <a
                        href={getPdfDownloadUrl(log.scan_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>PDF</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Records are signed with SHA-256 cryptographic hashes for non-repudiation.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
