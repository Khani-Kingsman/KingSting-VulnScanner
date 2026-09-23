# KING STING VULNScanner — Multi-Platform Device Security Audit Suite

[![Phase](https://img.shields.io/badge/Phase-1%20UI%2FUX%20Interactive%20Desktop%20Shell-00f2fe.svg)](#)
[![Compliance](https://img.shields.io/badge/Compliance-Strict%20Defensive%20Auditing-10b981.svg)](#)
[![Stack](https://img.shields.io/badge/Stack-Electron%20%7C%20React%20%7C%20FastAPI%20%7C%20ReportLab-blue.svg)](#)

**KING STING VULNScanner** (formerly codenamed *"Guardian"*) is a professional desktop security audit application designed for individuals and organizations (BYOD/IT Security Programs) to conduct structured, defensive, and non-intrusive security evaluations against devices they own or have explicit written authorization to test.

---

## 🛡️ Non-Negotiable Ground Rules (§2)

Built directly into the core application workflow, not just the documentation:

1. **Mandatory Authorization Gate**: A persistent consent and ownership confirmation is enforced before any scan can begin.
2. **Strictly Defensive**: 100% detection, configuration analysis, and vulnerability reporting. Zero weaponized exploit execution, zero payload delivery, and zero authentication bypasses.
3. **Legitimate Threat Intelligence**: CVE cross-referencing maps exclusively to official public databases (NVD, Android Security Bulletins, Apple Security Advisories).
4. **Immutable Local Audit Trail**: Every initiated scan session is recorded in a local SQLite database (`data/kingsting_audit.db`) with cryptographic SHA-256 signatures for compliance verification.

---

## 🚀 Key Modules & Capabilities

### 1. Android Module
- **OS & Security Patch Baseline**: Verifies build currency, patch lag, and kernel consistency.
- **Root & Privilege Integrity**: Detects `su` binaries, Magisk hide traces, and unlocked bootloaders.
- **Exposed Debug Interfaces**: Audits active ADB wireless daemons (TCP port 5555) and insecure USB debugging.
- **Storage Encryption**: Verifies File-Based Encryption (FBE) and StrongBox Keymaster hardware backing.
- **App Permission Overreach**: Flags sideloaded applications with excessive Accessibility, SMS, or Overlay privileges.
- **Vulnerability Intelligence**: Cross-references detected Android build fingerprints against documented CVEs.

### 2. Wireless Network Module
- **Beacon & Encryption Audit**: Evaluates 802.11 cipher suites (WPA2/WPA3), Protected Management Frames (PMF), and vulnerable WPS PIN settings.
- **Subnet Node Enumeration**: Discovers active endpoints across local `/24` IPv4 subnets.
- **OS Fingerprinting**: Profiles connected devices (routers, workstations, mobile endpoints, IoT smart hardware).
- **Service Attack Surface & Port Scan**: Flags cleartext or obsolete services (Telnet:23, SMB:445, unauthenticated RTSP:554).
- **Dynamic Live Risk Board**: Aggregates discovered network risks in real-time as the scan progresses.

### 3. iOS & iPadOS Module
- **OS Cadence & Patch Level**: Compares active iOS build against current Apple zero-day mitigation releases.
- **Jailbreak & Sandbox Integrity**: Inspects sandbox enforcement, dyld hooks, and `/private` container isolation.
- **Configuration Profiles & MDM**: Identifies untrusted enterprise mobile provisioning profiles and sideloaded certificates.
- **Root CA Trust Store**: Scans for user-installed root CA certificates and potential SSL proxy interception anchors.
- **Apple Advisory CVE Matching**: Correlates system state with documented WebKit and Kernel advisories.

---

## 🏗️ Architecture

```
d:\VulnScanner\
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI service (REST + WebSocket streaming)
│   │   ├── config.py                # Environment paths and configurations
│   │   ├── models/                  # Pydantic models (ScanRequest, Finding, AuditEntry)
│   │   ├── engine/                  # Scan lifecycle manager & simulated engine
│   │   │   ├── base.py
│   │   │   ├── mock_android.py
│   │   │   ├── mock_wireless.py
│   │   │   ├── mock_ios.py
│   │   │   └── live_manager.py
│   │   ├── reports/
│   │   │   └── pdf_generator.py     # Professional ReportLab PDF report generation
│   │   └── db/
│   │       └── audit_log.py         # SQLite persistence for compliance audit trail
│   ├── data/                        # Generated reports & SQLite database
│   ├── test_backend.py              # Backend automated verification suite
│   └── requirements.txt
├── frontend/
│   ├── electron/
│   │   ├── main.cjs                 # Electron process launcher & backend manager
│   │   └── preload.cjs              # Secure IPC bridge
│   ├── src/
│   │   ├── components/
│   │   │   ├── background/          # Cyber Canvas particle & radar background
│   │   │   ├── layout/              # Topbar, Auditor badge, compliance status
│   │   │   ├── consent/             # Mandatory authorization modal
│   │   │   ├── modules/             # Module cards, Device discovery, Scan levels,
│   │   │   │                        # Active scan console, and Results hub
│   │   │   ├── history/             # Audit trail drawer
│   │   │   └── profile/             # Auditor profile settings
│   │   ├── services/api.ts          # REST & WebSocket client
│   │   ├── types/                   # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── index.css                # Tailwind CSS v4 & custom cyber themes
│   ├── package.json
│   └── vite.config.ts
├── run_desktop.bat                  # One-click Windows desktop launcher
└── README.md
```

---

## ⚡ Quickstart & Running the Application

### 1. Launch Desktop App (Windows)
Double-click `run_desktop.bat` or run:
```powershell
.\run_desktop.bat
```

### 2. Run in Development Mode (Browser / HMR)
**Terminal 1 (Backend):**
```powershell
python backend/app/main.py
```

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

### 3. Verify Backend Engine & PDF Generation
```powershell
python backend/test_backend.py
```

---

## 📄 Exportable PDF Audit Reports

Every completed scan allows instant export of a standardized, boardroom-ready PDF audit report containing:
- **Scope & Asset Metadata**: Serial/IP, OS version, interface, auditor name, and organization.
- **Security Scorecard**: 0–100 posture score with A–F grade and control evaluation summary.
- **Severity-Tiered Findings**: Critical, High, Medium, Low, and Info breakdowns with full CVE references.
- **Actionable Remediation**: Exact step-by-step instructions to harden each flagged control.
- **Cryptographic Sign-Off**: Non-repudiation audit hash and compliance disclaimer.

---

## 🗺️ Roadmap
- **Phase 1 (Complete)**: Full interactive desktop UI/UX shell, simulated scan engine, WebSocket real-time event streaming, ReportLab PDF report generation, and SQLite audit logging.
- **Phase 1.5**: Design review, UX ergonomics validation, and visual accessibility audits.
- **Phase 2**: Modular integration of live non-intrusive scanning libraries (`nmap`, `adb`, `libimobiledevice`, and direct NVD CVE API querying).
