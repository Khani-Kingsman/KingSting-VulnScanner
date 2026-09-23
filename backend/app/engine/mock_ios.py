from typing import List, Tuple
from datetime import datetime
from app.models.scan import ScanDepth, TargetDevice, CheckStep
from app.models.findings import Finding
from app.engine.base import BaseScanner

class MockIOSScanner(BaseScanner):
    def get_steps_for_depth(self, depth: ScanDepth) -> List[CheckStep]:
        quick_steps = [
            CheckStep(
                id="ios_ver_baseline",
                name="iOS Version & Security Cadence",
                description="Auditing iOS build version against latest Apple Security Releases",
                category="OS Baseline",
                duration_ms=1100
            ),
            CheckStep(
                id="ios_jailbreak_check",
                name="Jailbreak & Sandbox Integrity Audit",
                description="Checking for Cydia/Sileo binaries, writable /private directory, and sandbox bypasses",
                category="System Integrity",
                duration_ms=1300
            ),
            CheckStep(
                id="ios_passcode_data_prot",
                name="Passcode & Data Protection Classes",
                description="Verifying Secure Enclave passcode enforcement and NSFileProtectionComplete policy",
                category="Cryptographic Storage",
                duration_ms=1000
            ),
            CheckStep(
                id="ios_config_profiles",
                name="Configuration Profiles & MDM Enrollment",
                description="Auditing installed provisioning profiles, untrusted developer certs, and mobileconfig payloads",
                category="Profile Management",
                duration_ms=1400
            )
        ]

        standard_steps = quick_steps + [
            CheckStep(
                id="ios_cert_trust_store",
                name="Root CA Certificate Trust Store Audit",
                description="Scanning for user-installed trusted root certificates and potential SSL proxy anchors",
                category="Cryptographic Trust",
                duration_ms=1500
            ),
            CheckStep(
                id="ios_app_privacy_perms",
                name="App Privacy & TCC Permission Audit",
                description="Auditing apps with unrestricted access to Microphone, Camera, Location, and Local Network",
                category="Privacy & TCC",
                duration_ms=1700
            ),
            CheckStep(
                id="ios_cve_lookup",
                name="Apple Security Bulletin CVE Cross-Check",
                description="Cross-referencing detected iOS build against documented WebKit and Kernel zero-day advisories",
                category="Vulnerability Intelligence",
                duration_ms=1900
            )
        ]

        deep_steps = standard_steps + [
            CheckStep(
                id="ios_airdrop_ble",
                name="AirDrop & CoreBluetooth Exposure Review",
                description="Checking AirDrop discovery state ('Everyone' vs 'Contacts Only') and BLE beacon exposure",
                category="Peripheral Exposure",
                duration_ms=1200
            ),
            CheckStep(
                id="ios_lockdown_mode",
                name="Lockdown Mode & Advanced Protection Audit",
                description="Evaluating whether Lockdown Mode and Advanced Data Protection for iCloud are enabled",
                category="Hardening Configuration",
                duration_ms=1300
            ),
            CheckStep(
                id="ios_developer_mode",
                name="Developer Mode & Sideloaded App Inspection",
                description="Checking if iOS Developer Mode is permanently active and auditing expiration of enterprise apps",
                category="Application Security",
                duration_ms=1600
            ),
            CheckStep(
                id="ios_cve_exploit_history",
                name="Historic Exploit Trend for A-Series SoC",
                description="Analyzing hardware-level vulnerability history (checkm8, memory corruption) for this hardware",
                category="Historical Analytics",
                duration_ms=1400
            )
        ]

        if depth == "quick":
            return quick_steps
        elif depth == "standard":
            return standard_steps
        else:
            return deep_steps

    def execute_step(self, step: CheckStep, target: TargetDevice, depth: ScanDepth) -> Tuple[CheckStep, List[Finding]]:
        findings = []
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if step.id == "ios_ver_baseline":
            step.status = "warning"
            step.details = "iOS 17.1.1 detected. Target is 4 minor updates behind current security release (iOS 17.5+)."
            f = Finding(
                id="FIND-IOS-001",
                title="Outdated iOS Operating System Version",
                category="OS Baseline",
                severity="medium",
                description="The target device is running iOS 17.1.1, which lacks critical zero-day mitigations released in Apple security updates 17.2 through 17.5.",
                remediation="Go to Settings -> General -> Software Update and install the latest available iOS update.",
                component="iOS Kernel / Framework",
                detected_at=now
            )
            findings.append(f)
            step.findings_generated.append(f.id)

        elif step.id == "ios_jailbreak_check":
            step.status = "passed"
            step.details = "App sandbox is fully enforced. No Cydia/Sileo binaries, dyld hooks, or unsigned kernel patches detected."

        elif step.id == "ios_passcode_data_prot":
            step.status = "passed"
            step.details = "6-digit passcode enforced with Secure Enclave protection and USB Restricted Mode active."

        elif step.id == "ios_config_profiles":
            step.status = "warning"
            step.details = "Found 1 unknown Enterprise Provisioning Profile installed via Safari."
            f = Finding(
                id="FIND-IOS-002",
                title="Untrusted Enterprise Mobile Provisioning Profile Installed",
                category="Profile Management",
                severity="high",
                description="A custom configuration profile was installed outside an official MDM portal, allowing sideloading of unvetted enterprise binaries that bypass App Store sandbox review.",
                remediation="Open Settings -> General -> VPN & Device Management, review installed profiles, and remove unverified enterprise certificates.",
                component="Apple Configuration Engine",
                detected_at=now
            )
            findings.append(f)
            step.findings_generated.append(f.id)

        elif step.id == "ios_cert_trust_store":
            step.status = "passed"
            step.details = "Standard Apple System Roots only. No user-installed root CA certificates in Trust Store."

        elif step.id == "ios_app_privacy_perms":
            step.status = "warning"
            step.details = "3 non-essential utility apps have 'Always Allow' background location access."
            f = Finding(
                id="FIND-IOS-003",
                title="Excessive Background Location Tracking Permissions",
                category="Privacy & TCC",
                severity="low",
                description="Multiple third-party utility applications have persistent background location access enabled, allowing passive geolocation telemetry collection.",
                remediation="Go to Settings -> Privacy & Security -> Location Services and change app permissions to 'While Using App' or 'Never'.",
                component="Apple TCC (Location Services)",
                detected_at=now
            )
            findings.append(f)
            step.findings_generated.append(f.id)

        elif step.id == "ios_cve_lookup":
            step.status = "failed"
            step.details = "2 critical unpatched CVEs found affecting WebKit and Kernel (CVE-2023-42916 & CVE-2023-41991)."
            f1 = Finding(
                id="FIND-IOS-004",
                title="WebKit Memory Corruption Remote Code Execution (CVE-2023-42916)",
                category="Vulnerability Intelligence",
                severity="critical",
                description="Processing web content in Safari or WebViews may lead to arbitrary code execution due to an out-of-bounds read in WebKit. Publicly reported exploited in the wild.",
                remediation="Immediately update device to iOS 17.2 or later to patch the WebKit vulnerability.",
                cve_id="CVE-2023-42916",
                cvss_score=9.8,
                component="Apple WebKit Engine",
                detected_at=now
            )
            f2 = Finding(
                id="FIND-IOS-005",
                title="Kernel Code Signature Validation Bypass (CVE-2023-41991)",
                category="Vulnerability Intelligence",
                severity="high",
                description="A local attacker with execution privileges may bypass code signing checks due to an issue in CoreGraphics / Kernel validation.",
                remediation="Install latest iOS firmware update and refrain from installing unverified configuration profiles.",
                cve_id="CVE-2023-41991",
                cvss_score=8.4,
                component="XNU Kernel / CoreGraphics",
                detected_at=now
            )
            findings.extend([f1, f2])
            step.findings_generated.extend([f1.id, f2.id])

        elif step.id == "ios_airdrop_ble":
            step.status = "warning"
            step.details = "AirDrop is configured to 'Everyone for 10 Minutes' without automatic timeout."
            f = Finding(
                id="FIND-IOS-006",
                title="AirDrop Open to Everyone (Proximity Leaks)",
                category="Peripheral Exposure",
                severity="low",
                description="AirDrop is discoverable by all nearby devices, exposing the device owner's contact name and device model to nearby observers.",
                remediation="Set AirDrop to 'Contacts Only' or 'Receiving Off' in Control Center or Settings -> General -> AirDrop.",
                component="AirDrop / CoreBluetooth",
                detected_at=now
            )
            findings.append(f)
            step.findings_generated.append(f.id)

        elif step.id == "ios_lockdown_mode":
            step.status = "passed"
            step.details = "Device is configured with standard protection; Lockdown Mode evaluated as optional."

        elif step.id == "ios_developer_mode":
            step.status = "passed"
            step.details = "iOS Developer Mode is currently Disabled."

        elif step.id == "ios_cve_exploit_history":
            step.status = "passed"
            step.details = "Device SoC has hardware-level mitigation against Checkm8 and BootROM fault injection."

        else:
            step.status = "passed"
            step.details = "Check completed successfully."

        return step, findings
