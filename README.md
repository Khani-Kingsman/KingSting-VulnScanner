# KING STING VULNScanner

### Multi-Platform Device Security Audit Suite

[![Status](https://img.shields.io/badge/Status-Active%20Prototype%20%2F%20WIP-orange.svg)](#project-status)
[![Type](https://img.shields.io/badge/Audit%20Model-Defensive%20%26%20Non--Intrusive-emerald.svg)](#defensive-audit-model)
[![Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20Electron%20%7C%20React%20%7C%20Tailwind-blue.svg)](#technical-architecture)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)

---

> [!WARNING]
> ### Project Status: Active Prototype / Work In Progress (WIP)
> This repository contains an **early-stage architectural prototype** of KING STING VULNScanner. Core device interrogation modules, wireless discovery routines, and compliance workflows are actively undergoing stabilization and development.
>
> **Notice**: This software is not yet in its finalized production state. It is undergoing active development and internal testing. Production-grade releases with expanded scanning capabilities, full driver abstraction, and broader device support will be rolled out systematically.

---

## Overview

**KING STING VULNScanner** is a cross-platform desktop security audit suite engineered for security professionals, IT administrators, and individuals managing BYOD environments. The application provides structured, defensible, and non-destructive posture evaluations across three primary vectors:

1. **Wireless Local Subnets & Network Infrastructure**
2. **Android Mobile Endpoints (Physical USB & Wireless ADB)**
3. **iOS & iPadOS Hardware & Profiles**

Audits produce structured telemetry, identify misconfigurations or unpatched components, correlate findings against official CVE bulletins, and generate signed compliance records.

---

## Defensive Audit Model

All assessment routines adhere strictly to non-destructive auditing standards:

* **Affirmative Authorization Gate**: Scans require explicit confirmation of device ownership or written testing authorization. If permission is denied (`Do Not Allow`), execution halts immediately with zero packets or probes dispatched.
* **Non-Intrusive Telemetry**: The engine performs configuration audits, banner inspection, interface verification, and patch-level analysis. It does not deliver weaponized payloads, attempt exploitation, or deploy authentication bypasses.
* **Public Threat Intelligence**: Vulnerability correlation maps exclusively to verified public feeds (NVD, Android Security Bulletins, Apple Security Releases).
* **Cryptographic Audit Trail**: All completed assessments are committed to a local SQLite database (`kingsting_audit.db`) with SHA-256 integrity hashes for audit verification and non-repudiation.

---

## Modules

### 1. Wireless Network Module
* **WLAN Configuration Audit**: Evaluates active 802.11 beacons, authentication methods (WPA2/WPA3 Personal/Enterprise), cipher suites (CCMP, TKIP), and Protected Management Frames (PMF) enforcement.
* **Subnet Host Discovery**: Rapid ARP cache interrogation and ICMP/socket discovery across `/24` IPv4 subnets to enumerate routers, endpoints, smartphones, and IoT hardware.
* **Gateway Attack Surface Sweep**: Non-blocking TCP connection probing against standard service ports (FTP:21, SSH:22, Telnet:23, DNS:53, HTTP:80, HTTPS:443, SMB:445, RTSP:554, WebProxy:8080).
* **DNS Resolution Integrity**: Validates consistency between local gateway resolvers and known public secure resolvers (Cloudflare, Google Public DNS) to detect potential redirection or DNS hijacking.

### 2. Android Module
* **Instant QR Wireless Onboarding**: Zero-cable pairing via high-contrast cyber QR code (`/mobile-audit`), extracting real hardware concurrency, WebGL GPU profile, screen density, and initiating automated permission consent.
* **Cable-Free Wireless Interrogation**: Direct integration with Android 11+ Wireless Debugging using 6-digit pairing codes (`adb pair`) and direct network ports (`adb connect`), enabling deep mobile audits without a physical USB cable.
* **OS & Patch Level Baseline**: Verifies Android OS version currency, Security Patch Level lag, and OEM lifecycle status (e.g. Samsung Galaxy S10 end-of-support advisories).
* **Root & Privilege Integrity**: Checks for binary artifacts (`su`, SuperSU, Magisk traces), test-keys builds, and listening root remote command shells.
* **Service & Test Port Sweep**: Real active socket probe testing for unauthenticated ADB daemons on TCP port 5555, cleartext HTTP servers, mobile FTP servers (2121), SSH daemons (8022), and custom test services.
* **Permission Overreach & User App Audit**: Evaluates application privilege footprints, identifying sideloaded packages requesting high-risk capabilities (Accessibility Services, Device Admin, SMS/Call Logs).

### 3. iOS, iPadOS & macOS Module
* **Apple Network Attack Surface**: Interrogates active Apple network services including mDNS/Bonjour (5353), AirPlay (7000), APNs (5223), and MobileDevice Lockdownd (62078).
* **Build & Firmware Cadence**: Validates iOS/iPadOS release version against Apple Security Bulletins and active zero-day advisories (e.g. WebKit CVE-2024-23222, CVE-2023-42916).
* **Sandbox Integrity**: Verifies containerization and integrity of filesystem isolation boundaries (read-only Signed System Volume).
* **Hardware Data Protection**: Audits Apple Secure Enclave Processor (SEP) binding and NSFileProtectionComplete cryptographic storage classes.
* **Configuration Profiles & MDM**: Identifies untrusted mobile device management (MDM) payloads, enterprise distribution certificates, and sideloaded provisioning profiles.
* **Root CA Trust Store Audit**: Flags user-installed root Certificate Authorities capable of enabling SSL/TLS proxy interception.

---

## Technical Architecture

```
KingSting-VulnScanner/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI REST endpoints, WebSocket streaming, and static SPA serving
│   │   ├── config.py                # Environment configuration, database paths, and constants
│   │   ├── models/                  # Pydantic data schemas (TargetDevice, ScanRequest, ScanResult, AuditEntry)
│   │   ├── discovery/               # Real hardware, network subnet, and ADB pairing detection
│   │   │   └── real_detector.py
│   │   ├── engine/                  # Scan lifecycle manager and execution matrix
│   │   │   └── live_manager.py
│   │   ├── reports/                 # PDF generation engine (ReportLab)
│   │   │   └── pdf_generator.py
│   │   └── db/                      # Local SQLite persistence layer
│   │       └── audit_log.py
│   ├── data/                        # Local database storage (kingsting_audit.db) and generated PDF files
│   └── requirements.txt             # Python dependencies
├── frontend/
│   ├── electron/
│   │   ├── main.cjs                 # Electron process management and native window lifecycle
│   │   └── preload.cjs              # Context isolation bridge
│   ├── src/
│   │   ├── components/
│   │   │   ├── background/          # Particle network canvas background
│   │   │   ├── consent/             # Mandatory security audit authorization modal
│   │   │   ├── modules/             # Module selectors, device interrogation, depth picker, active scan console
│   │   │   ├── history/             # Audit log drawer and compliance records
│   │   │   └── layout/              # Navigation bar, auditor profile badge, engine health indicator
│   │   ├── services/api.ts          # Backend HTTP and WebSocket client
│   │   ├── types/                   # TypeScript interface definitions
│   │   └── index.css                # Tailwind CSS v4 stylesheets
│   ├── package.json
│   └── vite.config.ts
├── run_desktop.bat                  # Desktop application launcher
└── README.md
```

---

## Getting Started

### Prerequisites
* **Python**: 3.10+ (with `pip`)
* **Node.js**: 18+ (with `npm`)
* **Operating System**: Windows 10/11 (macOS / Linux support planned in Phase 2)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Khani-Kingsman/KingSting-VulnScanner.git
   cd KingSting-VulnScanner
   ```

2. **Set Up Python Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Install Frontend & Electron Dependencies**
   ```bash
   cd ../frontend
   npm install
   npm run build
   ```

---

## Running the Application

### Option A: Complete Desktop Application (Recommended)
Launch the Python backend and Electron desktop shell together:
```cmd
run_desktop.bat
```

Alternatively, launch services manually:
```powershell
# Terminal 1: Backend Service
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765

# Terminal 2: Electron Desktop App
cd frontend
npm run electron
```

### Option B: Web Browser Access
The FastAPI backend serves the compiled frontend directly at root:
```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
```
Open your browser and navigate to:
```
http://127.0.0.1:8765
```

---

## Development & Testing

### Hot-Reload Development Mode
For UI/UX development with instant Vite HMR:
```powershell
# Terminal 1: Backend API
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765 --reload

# Terminal 2: Frontend Dev Server
cd frontend
npm run dev
```
Access the Vite development server at `http://127.0.0.1:5173`.

### Automated Verification
Run backend unit and integration checks:
```powershell
python backend/test_backend.py
```

---

## Development Roadmap

* [x] **Phase 1: Architecture & UI Prototype**
  * Interactive dark-mode security console with animated telemetry background.
  * Real subnet ARP sweep and active connected device identification.
  * Cable-free Android 11+ Wireless Debugging pairing (`adb pair` / `adb connect`).
  * Mandatory Permission Notification & Consent Gate.
  * Local SQLite audit logging with SHA-256 non-repudiation hashes.
  * Native ReportLab PDF report generation.
* [ ] **Phase 2: Scanning Engine Hardening (Upcoming)**
  * Native raw packet inspection drivers (Scapy/libpcap abstraction).
  * Direct asynchronous NVD REST API v2 CVE enrichment.
  * Native Apple MobileDevice protocol integration via `pymobiledevice3`.
  * Deep APK manifest parsing and permission graph analysis.
* [ ] **Phase 3: Production Release**
  * One-click installers (Windows MSI / macOS DMG / Linux AppImage).
  * Role-based auditor credential management.
  * Multi-target automated batch scanning.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
