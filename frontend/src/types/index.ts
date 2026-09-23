export type ScanModule = 'android' | 'wireless' | 'ios';
export type ScanDepth = 'quick' | 'standard' | 'deep';
export type ScanStatus = 'idle' | 'initializing' | 'running' | 'completed' | 'failed' | 'cancelled';
export type CheckStatus = 'pending' | 'running' | 'passed' | 'warning' | 'failed';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface TargetDevice {
  id: string;
  name: string;
  module: ScanModule;
  connection_mode: 'usb' | 'wifi' | 'network' | 'manual';
  ip_or_serial: string;
  os_version?: string;
  model_name?: string;
  vendor?: string;
  status: 'online' | 'offline' | 'unauthorized';
}

export interface CheckStep {
  id: string;
  name: string;
  description: string;
  category: string;
  status: CheckStatus;
  duration_ms: number;
  details?: string;
  findings_generated?: string[];
}

export interface Finding {
  id: string;
  title: string;
  category: string;
  severity: SeverityLevel;
  description: string;
  remediation: string;
  cve_id?: string;
  cvss_score?: number;
  component: string;
  detected_at?: string;
}

export interface ScanRequest {
  module: ScanModule;
  depth: ScanDepth;
  target: TargetDevice;
  authorized_by: string;
  organization: string;
  consent_confirmed: boolean;
}

export interface ScanResult {
  scan_id: string;
  module: ScanModule;
  depth: ScanDepth;
  target: TargetDevice;
  started_at: string;
  completed_at: string;
  status: ScanStatus;
  score: number;
  grade: string;
  total_checks: number;
  passed_checks: number;
  warning_checks: number;
  failed_checks: number;
  findings: Finding[];
  steps: CheckStep[];
  summary: string;
  authorized_by: string;
  organization: string;
  audit_hash: string;
  pdf_report_path?: string;
}

export interface AuditEntry {
  id?: number;
  scan_id: string;
  timestamp: string;
  target_name: string;
  target_identifier: string;
  module: string;
  depth: string;
  authorized_by: string;
  organization: string;
  score: number;
  findings_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  audit_hash: string;
  pdf_path?: string;
}

export interface AuditorProfile {
  name: string;
  organization: string;
  role: string;
}
