from typing import List, Tuple
from datetime import datetime
from app.models.scan import ScanDepth, TargetDevice, CheckStep
from app.models.findings import Finding
from app.engine.base import BaseScanner

class MockAndroidScanner(BaseScanner):
    def get_steps_for_depth(self, depth: ScanDepth) -> List[CheckStep]:
        quick_steps = [
            CheckStep(
                id="and_os_patch",
                name="OS & Security Patch Baseline",
                description="Auditing Android version, SPL date, and kernel patch consistency",
                category="OS Baseline",
                duration_ms=1100
            ),
            CheckStep(
                id="and_root_detect",
                name="Root & Privilege Integrity Check",
                description="Scanning for su binaries, Magisk hide traces, and unlocked bootloader status",
                category="System Integrity",
                duration_ms=1400
            ),
            CheckStep(
                id="and_debug_interface",
                name="Exposed Debug Interface Scan",
                description="Checking ADB TCP ports, USB debugging authorization, and wireless debugging",
                category="Network / Interfaces",
                duration_ms=1200
            ),
            CheckStep(
                id="and_storage_encrypt",
                name="Storage Encryption & KeyStore",
                description="Validating File-Based Encryption (FBE) and Hardware-Backed Keystore status",
                category="Cryptographic Storage",
                duration_ms=1000
            )
        ]

        standard_steps = quick_steps + [
            CheckStep(
                id="and_app_perms",
                name="Application Permission Overreach",
                description="Auditing third-party apps with SYSTEM_ALERT_WINDOW, Accessibility, and SMS access",
                category="Application Security",
                duration_ms=1600
            ),
            CheckStep(
                id="and_webview_comp",
                name="System WebView & Component Audit",
                description="Checking Android System WebView engine version and known renderer vulnerabilities",
                category="System Components",
                duration_ms=1300
            ),
            CheckStep(
                id="and_cve_lookup",
                name="Public NVD CVE Cross-Reference",
                description="Matching detected build fingerprint against official Android Security Bulletins",
                category="Vulnerability Intelligence",
                duration_ms=1800
            )
        ]

        deep_steps = standard_steps + [
            CheckStep(
                id="and_cert_store",
                name="User & System CA Trust Store Audit",
                description="Inspecting trusted user CA certificates and potential TLS interception proxies",
                category="Cryptographic Trust",
                duration_ms=1500
            ),
            CheckStep(
                id="and_exposed_services",
                name="Local Listening Sockets & IPC",
                description="Auditing non-loopback bound UNIX domain sockets and local listening daemons",
                category="IPC / Attack Surface",
                duration_ms=1700
            ),
            CheckStep(
                id="and_selinux_enforce",
                name="SELinux Policy & Enforcing State",
                description="Verifying SELinux is actively enforcing and checking permissive domain rules",
                category="Kernel Hardening",
                duration_ms=1200
            ),
            CheckStep(
                id="and_cve_trend",
                name="Vendor Model Historical CVE Trend",
                description="Aggregating historic vulnerability disclosures for this specific SoC and OEM model",
                category="Historical Analytics",
                duration_ms=1500
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

        if step.id == "and_os_patch":
            step.status = "warning"
            step.details = "Android 13 detected. Security Patch Level is 7 months out of date (2023-11-05)."
            f = Finding(
                id="FIND-AND-001",
                title="Outdated Android Security Patch Level",
                category="OS Baseline",
                severity="medium",
                description="The target device security patch date is 2023-11-05, missing 18+ high-severity patches released in recent Android Security Bulletins.",
                remediation="Navigate to Settings -> System -> System Update and install the latest vendor OEM security updates.",
                component="OS Build / Framework",
                detected_at=now
            )
            findings.append(f)
            step.findings_generated.append(f.id)

        elif step.id == "and_root_detect":
            step.status = "passed"
            step.details = "No su binaries, Superuser packages, or Magisk daemon signatures detected. Bootloader verified locked."

        elif step.id == "and_debug_interface":
            step.status = "failed"
            step.details = "ADB Wireless debugging active on port 5555 without TLS pairing enforcement."
            f = Finding(
                id="FIND-AND-002",
                title="Wireless ADB Debugging Exposed over TCP 5555",
                category="Network / Interfaces",
                severity="high",
                description="Android Debug Bridge daemon is listening on all network interfaces via port 5555, allowing any entity on the same local subnet to attach a remote debug shell.",
                remediation="Disable 'Wireless Debugging' in Developer Options and revoke USB debugging authorizations.",
                cve_id=None,
                cvss_score=7.8,
                component="adbd service (:5555)",
                detected_at=now
            )
            findings.append(f)
            step.findings_generated.append(f.id)

        elif step.id == "and_storage_encrypt":
            step.status = "passed"
            step.details = "File-Based Encryption (FBE) active with StrongBox Keymaster hardware backing."

        elif step.id == "and_app_perms":
            step.status = "warning"
            step.details = "2 sideloaded utilities hold excessive Background Accessibility & Notification permissions."
            f = Finding(
                id="FIND-AND-003",
                title="Excessive Accessibility Service Privileges Granted",
                category="Application Security",
                severity="medium",
                description="Two untrusted sideloaded applications possess Accessibility service bindings, enabling them to inspect screen content and keystrokes.",
                remediation="Review Settings -> Accessibility -> Installed Services and disable access for unknown or untrusted packages.",
                component="Accessibility Framework",
                detected_at=now
            )
            findings.append(f)
            step.findings_generated.append(f.id)

        elif step.id == "and_webview_comp":
            step.status = "passed"
            step.details = "Android System WebView updated to v124.0.6367; V8 engine patches present."

        elif step.id == "and_cve_lookup":
            step.status = "failed"
            step.details = "3 known unpatched CVEs found affecting kernel and system components."
            f1 = Finding(
                id="FIND-AND-004",
                title="Android Framework Privilege Escalation (CVE-2024-0044)",
                category="Vulnerability Intelligence",
                severity="critical",
                description="Public CVE-2024-0044 enables local unprivileged application to bypass package manager boundaries and read private application storage.",
                remediation="Apply the March 2024 or newer Android Security Patch Level bulletin release.",
                cve_id="CVE-2024-0044",
                cvss_score=9.1,
                component="android.os.ServiceManager",
                detected_at=now
            )
            f2 = Finding(
                id="FIND-AND-005",
                title="Bluetooth HCI Memory Corruption (CVE-2023-40113)",
                category="Vulnerability Intelligence",
                severity="high",
                description="Remote code execution vulnerability in the Bluetooth stack via crafted HCI packets without pairing required.",
                remediation="Disable Bluetooth when not in use and update system firmware immediately.",
                cve_id="CVE-2023-40113",
                cvss_score=8.4,
                component="com.android.bluetooth",
                detected_at=now
            )
            findings.extend([f1, f2])
            step.findings_generated.extend([f1.id, f2.id])

        elif step.id == "and_cert_store":
            step.status = "passed"
            step.details = "No custom user CA certificates found in User Credential Storage."

        elif step.id == "and_exposed_services":
            step.status = "passed"
            step.details = "All local IPC domain sockets conform to strict DAC & MAC access permissions."

        elif step.id == "and_selinux_enforce":
            step.status = "passed"
            step.details = "SELinux is in Enforcing mode with strict multi-user context."

        elif step.id == "and_cve_trend":
            step.status = "warning"
            step.details = "OEM model has reached end of monthly security bulletin lifecycle."
            f = Finding(
                id="FIND-AND-006",
                title="Device Approaching OEM End-of-Life (EOL)",
                category="Historical Analytics",
                severity="low",
                description="The manufacturer has placed this model on quarterly or extended phase-out security cycle, increasing the latency of future critical zero-day mitigations.",
                remediation="Evaluate device replacement roadmap for organizational BYOD compliance.",
                component="OEM Lifecycle",
                detected_at=now
            )
            findings.append(f)
            step.findings_generated.append(f.id)

        else:
            step.status = "passed"
            step.details = "Check completed successfully."

        return step, findings
