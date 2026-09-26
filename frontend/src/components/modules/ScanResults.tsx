import React, { useState } from 'react';
import type { ScanResult, SeverityLevel } from '../../types';
import { getPdfDownloadUrl } from '../../services/api';
import {
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Flame,
  FileText,
  Hash,
  ChevronDown,
  ChevronUp,
  ChevronLeft
} from 'lucide-react';

interface ScanResultsProps {
  result: ScanResult;
  onNewScan: () => void;
  onBackToTargets?: () => void;
  onBackToLevels?: () => void;
}

export const ScanResults: React.FC<ScanResultsProps> = ({
  result,
  onNewScan,
  onBackToTargets,
  onBackToLevels
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const critCount = result.findings.filter((f) => f.severity === 'critical').length;
  const highCount = result.findings.filter((f) => f.severity === 'high').length;
  const medCount = result.findings.filter((f) => f.severity === 'medium').length;
  const lowCount = result.findings.filter((f) => f.severity === 'low' || f.severity === 'info').length;

  const filteredFindings = result.findings.filter((f) => {
    if (filterSeverity === 'all') return true;
    return f.severity === filterSeverity;
  });

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const url = getPdfDownloadUrl(result.scan_id);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setTimeout(() => setDownloadingPdf(false), 1200);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/50 bg-emerald-950/20';
    if (score >= 70) return 'text-amber-400 border-amber-500/50 bg-amber-950/20';
    return 'text-rose-500 border-rose-500/50 bg-rose-950/20';
  };

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-rose-950/90 text-rose-300 border border-rose-800">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-orange-950/90 text-orange-300 border border-orange-800">
            <AlertOctagon className="w-3.5 h-3.5 text-orange-400" />
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-950/90 text-amber-300 border border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-blue-950/90 text-blue-300 border border-blue-800">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
              AUDIT VERIFIED
            </span>
            <span className="text-xs text-slate-500 font-mono">Scan Ref: {result.scan_id}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Security Posture & Compliance Report
          </h2>
          <p className="text-xs text-slate-400">
            Target: <strong className="text-slate-200">{result.target.name}</strong> • Completed {result.completed_at}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onBackToTargets && (
            <button
              onClick={onBackToTargets}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-cyan-400" />
              <span>Back to Targets</span>
            </button>
          )}

          {onBackToLevels && (
            <button
              onClick={onBackToLevels}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Change Depth</span>
            </button>
          )}

          <button
            onClick={onNewScan}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
          >
            <span>Home</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingPdf ? 'Exporting PDF...' : 'Download PDF Report'}</span>
          </button>
        </div>
      </div>

      {/* Scorecard Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-8">
        {/* Score Gauge */}
        <div className="md:col-span-4 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center shadow-xl">
          <div
            className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center mb-3 ${getScoreColor(
              result.score
            )}`}
          >
            <span className="text-3xl font-black">{result.score}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Grade {result.grade}
            </span>
          </div>
          <h4 className="text-sm font-bold text-white mb-1">Overall Security Score</h4>
          <p className="text-xs text-slate-400">
            {result.score >= 85
              ? 'Strong security baseline established.'
              : result.score >= 70
              ? 'Moderate exposure — remediate high priorities.'
              : 'Deficiencies detected — urgent action required.'}
          </p>
        </div>

        {/* Severity Metrics Breakdown */}
        <div className="md:col-span-8 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between shadow-xl">
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
              Vulnerability Severity Tiers
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/40">
                <span className="text-xs font-semibold text-rose-400 block mb-1">Critical</span>
                <span className="text-2xl font-black text-rose-300">{critCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-orange-950/30 border border-orange-900/40">
                <span className="text-xs font-semibold text-orange-400 block mb-1">High</span>
                <span className="text-2xl font-black text-orange-300">{highCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/40">
                <span className="text-xs font-semibold text-amber-400 block mb-1">Medium</span>
                <span className="text-2xl font-black text-amber-300">{medCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-900/40">
                <span className="text-xs font-semibold text-blue-400 block mb-1">Low / Info</span>
                <span className="text-2xl font-black text-blue-300">{lowCount}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-slate-500 font-medium">Controls Evaluated: </span>
              <strong>{result.total_checks}</strong> ({result.passed_checks} passed, {result.warning_checks} advisories)
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
              <Hash className="w-3.5 h-3.5 text-cyan-400" />
              <span>Audit Hash: {result.audit_hash.substring(0, 16)}...</span>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary Box */}
      <div className="mb-8 p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>Executive Summary & Methodology Review</span>
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed mb-3">{result.summary}</p>
        <p className="text-[11px] text-slate-500">
          Authorized by <strong className="text-slate-400">{result.authorized_by}</strong> on behalf of{' '}
          <strong className="text-slate-400">{result.organization}</strong>. Audit complied with non-weaponized defensive constraints.
        </p>
      </div>

      {/* Findings Section */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-bold text-white">
            Audit Findings & Detailed Remediation ({result.findings.length})
          </h3>

          {/* Severity Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-3 py-1 rounded-lg font-semibold uppercase text-[10px] transition-colors ${
                  filterSeverity === sev
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {filteredFindings.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
            No findings match the selected severity filter.
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredFindings.map((finding) => {
              const isExpanded = expandedFindingId === finding.id;
              return (
                <div
                  key={finding.id}
                  className="rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 transition-all overflow-hidden shadow-lg"
                >
                  <div
                    onClick={() => setExpandedFindingId(isExpanded ? null : finding.id)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      {getSeverityBadge(finding.severity)}
                      <div>
                        <h4 className="text-sm font-bold text-white hover:text-cyan-300 transition-colors">
                          {finding.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-400 mt-0.5">
                          <span>
                            <strong className="text-slate-500">Component:</strong> {finding.component}
                          </span>
                          {finding.cve_id && (
                            <span className="text-cyan-400 font-mono font-semibold">
                              {finding.cve_id} (CVSS {finding.cvss_score})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="text-[11px] hidden sm:inline">
                        {isExpanded ? 'Collapse' : 'Remediation'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-5 pt-0 border-t border-slate-800/80 mt-2 space-y-3 text-xs">
                      <div>
                        <h5 className="font-semibold text-slate-300 mb-1">Vulnerability Analysis:</h5>
                        <p className="text-slate-400 leading-relaxed">{finding.description}</p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-900/40">
                        <h5 className="font-bold text-cyan-300 mb-1 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Actionable Remediation Guidance:</span>
                        </h5>
                        <p className="text-slate-300 leading-relaxed">{finding.remediation}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
