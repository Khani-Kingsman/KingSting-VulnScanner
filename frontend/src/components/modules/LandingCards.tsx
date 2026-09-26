import React from 'react';
import { Smartphone, Wifi, Apple, ShieldCheck, ArrowRight } from 'lucide-react';
import type { ScanModule } from '../../types';

interface LandingCardsProps {
  onSelectModule: (module: ScanModule) => void;
}

export const LandingCards: React.FC<LandingCardsProps> = ({ onSelectModule }) => {
  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4">
      {/* Title / Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Multi-Platform Defensive Audit Engine</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
          Select Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">Target Audit Environment</span>
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400">
          Run deep, non-intrusive security evaluations across endpoints and networks you own or are authorized to audit. 
          Generate instant, boardroom-ready compliance reports.
        </p>
      </div>

      {/* Three Big Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Android Card */}
        <div
          onClick={() => onSelectModule('android')}
          className="group relative rounded-2xl bg-slate-900/70 hover:bg-slate-850/80 border border-slate-800 hover:border-emerald-500/50 p-6 sm:p-7 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950/40 cursor-pointer flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />

          <div>
            {/* Module Icon */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center justify-center w-13 h-13 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:scale-110 transition-transform">
                <Smartphone className="w-7 h-7" />
              </div>
              <span className="px-2.5 py-1 rounded-md bg-slate-800 text-[11px] font-semibold text-slate-300 border border-slate-700">
                ADB / USB / WiFi
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
              Android Module
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Examine Android smartphones, tablets, and POS terminals for OS patch lag, root compromises, excessive app permissions, and exposed debug ports.
            </p>

            {/* Checklist Preview */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Security Patch & Kernel Baseline</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Root, Magisk & Bootloader Integrity</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Network ADB & Storage Encryption</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Android Security Bulletin CVE Lookup</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
            <span>Configure Android Audit</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Wireless Network Card */}
        <div
          onClick={() => onSelectModule('wireless')}
          className="group relative rounded-2xl bg-slate-900/70 hover:bg-slate-850/80 border border-slate-800 hover:border-cyan-500/50 p-6 sm:p-7 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-950/40 cursor-pointer flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center justify-center w-13 h-13 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 group-hover:scale-110 transition-transform">
                <Wifi className="w-7 h-7" />
              </div>
              <span className="px-2.5 py-1 rounded-md bg-slate-800 text-[11px] font-semibold text-slate-300 border border-slate-700">
                802.11 / Subnet
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
              Wireless Network
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Audit Wi-Fi encryption strength, enumerate local subnet nodes, detect rogue gateways, audit open services, and feed results into a real-time Risk Board.
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>WPA2/WPA3 & PMF Beacon Audit</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Subnet Device Enumeration & OS ID</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Open Ports (Telnet, SMB, RTSP)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Real-time Dynamic Risk Board</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
            <span>Configure Wireless Audit</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* iOS Card - Coming Soon */}
        <div
          className="group relative rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 sm:p-7 transition-all duration-300 opacity-70 cursor-not-allowed flex flex-col justify-between"
        >
          <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-extrabold uppercase tracking-wider">
            Coming Soon
          </div>

          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center justify-center w-13 h-13 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-slate-400">
                <Apple className="w-7 h-7" />
              </div>
              <span className="px-2.5 py-1 rounded-md bg-slate-800/60 text-[11px] font-semibold text-slate-400 border border-slate-700/50">
                In Development
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-300 mb-2">
              iOS & iPadOS
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              MobileDevice USB driver subsystem and iOS container sandbox interrogation are currently in prototype development and will launch in an upcoming release.
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>iOS Release Cadence & Patch Level</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>Jailbreak & Sandbox Integrity Check</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>Configuration Profiles & CA Roots</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>WebKit & Kernel Advisory Matching</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Prototype in Progress</span>
            <span className="text-[11px] text-amber-400/90 font-mono">Q4 Roadmap</span>
          </div>
        </div>
      </div>
    </div>
  );
};
