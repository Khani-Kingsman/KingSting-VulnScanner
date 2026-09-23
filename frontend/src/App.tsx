import React, { useState, useEffect } from 'react';
import type { ScanModule, ScanDepth, TargetDevice, ScanResult, AuditorProfile } from './types';
import { checkBackendHealth, startScan } from './services/api';
import { CyberBackground } from './components/background/CyberBackground';
import { Navbar } from './components/layout/Navbar';
import { LandingCards } from './components/modules/LandingCards';
import { DeviceSelect } from './components/modules/DeviceSelect';
import { ScanLevels } from './components/modules/ScanLevels';
import { ActiveScan } from './components/modules/ActiveScan';
import { ScanResults } from './components/modules/ScanResults';
import { ConsentModal } from './components/consent/ConsentModal';
import { AuditHistoryModal } from './components/history/AuditHistoryModal';
import { AuditorProfileModal } from './components/profile/AuditorProfileModal';

export const App: React.FC = () => {
  // Navigation Flow States
  const [currentStep, setCurrentStep] = useState<'landing' | 'devices' | 'levels' | 'scanning' | 'results'>('landing');
  const [activeModule, setActiveModule] = useState<ScanModule | null>(null);
  const [activeTarget, setActiveTarget] = useState<TargetDevice | null>(null);
  const [activeDepth, setActiveDepth] = useState<ScanDepth>('standard');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // Modals
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Backend Health
  const [backendOnline, setBackendOnline] = useState(false);

  // Auditor Profile Settings
  const [auditor, setAuditor] = useState<AuditorProfile>(() => {
    const saved = localStorage.getItem('ks_auditor_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      name: 'Khani Kingsman',
      organization: 'Defensive Cyber Operations / BYOD',
      role: 'Principal Security Assessor'
    };
  });

  const handleSaveProfile = (updated: AuditorProfile) => {
    setAuditor(updated);
    localStorage.setItem('ks_auditor_profile', JSON.stringify(updated));
  };

  // Poll backend health on mount
  useEffect(() => {
    const checkHealth = async () => {
      const res = await checkBackendHealth();
      setBackendOnline(res.status === 'online');
    };
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Flow Handlers
  const handleSelectModule = (mod: ScanModule) => {
    setActiveModule(mod);
    setCurrentStep('devices');
  };

  const handleSelectDevice = (device: TargetDevice) => {
    setActiveTarget(device);
    setCurrentStep('levels');
  };

  const handleStartConsent = (depth: ScanDepth) => {
    setActiveDepth(depth);
    setIsConsentOpen(true);
  };

  const handleConfirmScan = async () => {
    if (!activeModule || !activeTarget) return;
    setIsConsentOpen(false);
    setCurrentStep('scanning');

    try {
      await startScan({
        module: activeModule,
        depth: activeDepth,
        target: activeTarget,
        authorized_by: auditor.name,
        organization: auditor.organization,
        consent_confirmed: true
      });
    } catch (err: any) {
      console.error('Failed to dispatch scan:', err);
      alert(`Scan launch error: ${err.message || err}`);
    }
  };

  const handleScanFinished = (result: ScanResult) => {
    setScanResult(result);
    setCurrentStep('results');
  };

  const handleResetFlow = () => {
    setActiveModule(null);
    setActiveTarget(null);
    setScanResult(null);
    setCurrentStep('landing');
  };

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Dynamic Animated Cyber Background */}
      <CyberBackground />

      {/* Main Top Navigation */}
      <Navbar
        currentModule={activeModule}
        onSelectHome={handleResetFlow}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        auditor={auditor}
        backendOnline={backendOnline}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col">
        {currentStep === 'landing' && <LandingCards onSelectModule={handleSelectModule} />}

        {currentStep === 'devices' && activeModule && (
          <DeviceSelect
            module={activeModule}
            onBack={() => setCurrentStep('landing')}
            onSelectDevice={handleSelectDevice}
          />
        )}

        {currentStep === 'levels' && activeModule && activeTarget && (
          <ScanLevels
            module={activeModule}
            target={activeTarget}
            onBack={() => setCurrentStep('devices')}
            onStartConsent={handleStartConsent}
          />
        )}

        {currentStep === 'scanning' && activeModule && activeTarget && (
          <ActiveScan
            target={activeTarget}
            depth={activeDepth}
            onScanFinished={handleScanFinished}
          />
        )}

        {currentStep === 'results' && scanResult && (
          <ScanResults result={scanResult} onNewScan={handleResetFlow} />
        )}
      </main>

      {/* Footer Ground Rules & Non-Exploitation Guarantee */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950/70 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <span>
            <strong>KING STING VULNScanner</strong> • Built for defensive verification, compliance, and authorized auditing.
          </span>
          <span className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Zero Payload Delivery</span>
            <span className="text-slate-600">•</span>
            <span>Zero Exploitation</span>
            <span className="text-slate-600">•</span>
            <span>Public NVD Feeds Only</span>
          </span>
        </div>
      </footer>

      {/* Modals */}
      <ConsentModal
        isOpen={isConsentOpen}
        targetName={activeTarget?.name || 'Selected Device'}
        moduleName={activeModule || 'General'}
        onConfirm={handleConfirmScan}
        onCancel={() => setIsConsentOpen(false)}
      />

      <AuditHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

      <AuditorProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={auditor}
        onSave={handleSaveProfile}
      />
    </div>
  );
};

export default App;
