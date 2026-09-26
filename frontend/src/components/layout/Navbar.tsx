import React from 'react';
import { Shield, History, User, ChevronLeft } from 'lucide-react';
import type { AuditorProfile } from '../../types';

interface NavbarProps {
  currentModule: string | null;
  onSelectHome: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  auditor: AuditorProfile;
  backendOnline: boolean;
  canGoBack?: boolean;
  onBack?: () => void;
  stepTitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentModule,
  onSelectHome,
  onOpenHistory,
  onOpenProfile,
  auditor,
  backendOnline,
  canGoBack,
  onBack,
  stepTitle
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand & Universal Back Button */}
        <div className="flex items-center gap-3 sm:gap-4">
          {canGoBack && onBack && (
            <button
              onClick={onBack}
              title="Return to Previous Step"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 hover:border-cyan-500/50 text-xs font-bold transition-all cursor-pointer shadow-md shadow-slate-950/50 group"
            >
              <ChevronLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back</span>
            </button>
          )}

          <div className="flex items-center gap-3 cursor-pointer" onClick={onSelectHome}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 shrink-0">
              <Shield className="w-5 h-5 text-white" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-sm sm:text-base text-white">
                  KING STING <span className="text-cyan-400">VULNScanner</span>
                </span>
                <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                  PHASE 1
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate max-w-[200px] sm:max-w-none">
                {stepTitle || 'Defensive Security Audit Suite'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Active Module Breadcrumb */}
        {currentModule && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
            <span className="text-slate-500">Active Module:</span>
            <span className="font-semibold text-cyan-300 uppercase">{currentModule}</span>
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Backend Status indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px]">
            <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-500'}`} />
            <span className="text-slate-400">{backendOnline ? 'Engine Online' : 'Engine Offline'}</span>
          </div>

          {/* Audit History Drawer Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 transition-colors shadow-sm"
          >
            <History className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Audit Trail</span>
          </button>

          {/* Auditor Profile Button */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-900 to-slate-850 hover:from-slate-850 hover:to-slate-800 border border-slate-800 text-xs text-slate-200 transition-colors shadow-sm"
          >
            <User className="w-4 h-4 text-blue-400" />
            <div className="text-left hidden sm:block">
              <p className="text-[11px] font-semibold text-slate-200 leading-tight">{auditor.name}</p>
              <p className="text-[9px] text-slate-400 leading-tight truncate max-w-[120px]">{auditor.organization}</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
