from typing import List, Tuple
from datetime import datetime
from app.models.scan import ScanDepth, TargetDevice, CheckStep
from app.models.findings import Finding
from app.engine.base import BaseScanner

class MockWirelessScanner(BaseScanner):
    def get_steps_for_depth(self, depth: ScanDepth) -> List[CheckStep]:
        quick_steps = [
            CheckStep(
                id="wifi_beacon_enc",
                name="Wireless Beacon & Encryption Audit",
                description="Auditing SSID broadcast, 802.11 cipher suite (WPA2/WPA3), and PMF capability",
                category="WiFi Protocol Security",
                duration_ms=1200
            ),
            CheckStep(
                id="wifi_wps_state",
                name="WPS & Management Frame Inspection",
                description="Checking Wi-Fi Protected Setup (WPS PIN/PBC vulnerability) and deauth resistance",
                category="WiFi Protocol Security",
                duration_ms=1000
            ),
            CheckStep(
                id="wifi_subnet_enum",
                name="Active Subnet Device Enumeration",
                description="ARP broadcast discovery and ICMP ping sweep across local IPv4 /24 subnet",
                category="Subnet Topology",
                duration_ms=1500
            ),
            CheckStep(
                id="wifi_gateway_exposure",
                name="Default Gateway & DNS Hijack Check",
                description="Auditing router administrative interfaces, rogue DHCP responses, and DNS servers",
                category="Gateway Infrastructure",
                duration_ms=1300
            )
        ]

        standard_steps = quick_steps + [
            CheckStep(
                id="wifi_os_fingerprint",
                name="Connected Node OS Fingerprinting",
                description="Analyzing TCP window sizes, TTL signatures, and mDNS/UPnP service advertisements",
                category="Asset Profiling",
                duration_ms=1800
            ),
            CheckStep(
                id="wifi_port_scan",
                name="Common Ports & Legacy Protocol Audit",
                description="Port scanning top 100 ports (SMB:445, Telnet:23, HTTP:80, RTSP:554, SSH:22)",
                category="Port / Service Attack Surface",
                duration_ms=2200
            ),
            CheckStep(
                id="wifi_weak_auth",
                name="Default Credentials & Cleartext Services",
                description="Auditing cleartext transmission of HTTP basic authentication and legacy SNMP v1/v2c",
                category="Service Authentication",
                duration_ms=1600
            )
        ]

        deep_steps = standard_steps + [
            CheckStep(
                id="wifi_iot_vuln",
                name="Smart Home / IoT Device Firmware Review",
                description="Inspecting connected security cameras, smart plugs, and network appliances for known flaws",
                category="IoT Vulnerabilities",
                duration_ms=1900
            ),
            CheckStep(
                id="wifi_cve_lookup",
                name="Network Service CVE Intelligence Query",
                description="Querying public NVD database for identified server banners (OpenSSH, Samba, Apache)",
                category="Vulnerability Intelligence",
                duration_ms=2100
            ),
            CheckStep(
                id="wifi_smb_netbios",
                name="SMB Signing & NetBIOS Poisoning Risk",
                description="Checking for SMBv1 presence, mandatory SMB packet signing, and LLMNR/NBT-NS broadcasts",
                category="Protocol Hardening",
                duration_ms=1500
            ),
            CheckStep(
                id="wifi_risk_board_agg",
                name="Network Topology Risk Board Consolidation",
                description="Correlating asset criticality, threat vectors, and blast radius into unified risk graph",
                category="Aggregated Analytics",
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

        if step.id == "wifi_beacon_enc":
            step.status = "warning"
            step.details = "WPA2-PSK (AES-CCMP) active. WPA3 transition mode disabled; PMF is optional."
            f = Finding(
                id="FIND-WIFI-001",
                title="WPA3 & Protected Management Frames (PMF) Not Enforced",
                category="WiFi Protocol Security",
                severity="medium",
                description="The wireless access point operates solely on WPA2-PSK without requiring 802.11w Protected Management Frames (PMF), exposing connected clients to wireless deauthentication attacks.",
                remediation="Enable WPA3-Personal or WPA2/WPA3 Mixed Mode with Protected Management Frames set to 'Required' in router wireless settings.",
                component="WiFi AP (802.11ax/ac)",
                detected_at=now
            )
            findings.append(f)
            step.findings_generated.append(f.id)

        elif step.id == "wifi_wps_state":
            step.status = "failed"
            step.details = "WPS (Wi-Fi Protected Setup) PIN mode is enabled on the gateway AP."
            f = Finding(
                id="FIND-WIFI-002",
                title="Vulnerable WPS PIN Authentication Enabled",
                category="WiFi Protocol Security",
                severity="high",
                description="Wi-Fi Protected Setup (WPS) PIN feature is active on the access point, making the network susceptible to offline and online PIN brute-force retrieval of the master network key.",
                remediation="Log into router admin panel and permanently disable Wi-Fi Protected Setup (WPS).",
                cve_id="CVE-2011-5053",
                cvss_score=8.2,
                component="Gateway AP WPS Daemon",
                detected_at=now
            )
            findings.append(f)
            step.findings_generated.append(f.id)

        elif step.id == "wifi_subnet_enum":
            step.status = "passed"
            step.details = "Discovered 7 active endpoints on subnet (1 Gateway, 2 Laptops, 2 Phones, 2 IoT Devices)."

        elif step.id == "wifi_gateway_exposure":
            step.status = "warning"
            step.details = "Gateway administration portal accessible via unencrypted HTTP on port 80."
            f = Finding(
                id="FIND-WIFI-003",
                title="Unencrypted Router Web Management Interface",
                category="Gateway Infrastructure",
                severity="medium",
                description="The administrative dashboard at 192.168.1.1 is accessible over plain HTTP, allowing network eavesdroppers to intercept session tokens or credentials.",
                remediation="Enforce HTTPS-only administration in router settings and redirect port 80 requests.",
                component="Gateway 192.168.1.1:80",
                detected_at=now
            )
            findings.append(f)
            step.findings_generated.append(f.id)

        elif step.id == "wifi_os_fingerprint":
            step.status = "passed"
            step.details = "Fingerprinted devices: Linux 5.15 (Router), Windows 11 (22H2), iOS 17.4, Android 14, Embedded RTOS."

        elif step.id == "wifi_port_scan":
            step.status = "failed"
            step.details = "Found obsolete Telnet service (port 23) and unauthenticated RTSP stream (port 554) on IoT host."
            f1 = Finding(
                id="FIND-WIFI-004",
                title="Legacy Telnet Service Active on Network Node",
                category="Port / Service Attack Surface",
                severity="high",
                description="Host 192.168.1.45 has port 23 (Telnet) open. Telnet transmits all commands and credentials in cleartext over the local network.",
                remediation="Disable Telnet daemon on endpoint and transition all remote shell administration to SSH (port 22) with key-based authentication.",
                component="192.168.1.45:23",
                detected_at=now
            )
            f2 = Finding(
                id="FIND-WIFI-005",
                title="Unauthenticated RTSP Surveillance Video Stream",
                category="Port / Service Attack Surface",
                severity="high",
                description="Network IP Camera at 192.168.1.78 exposes an unauthenticated RTSP video stream on port 554, allowing local network users to view live video feeds.",
                remediation="Configure strong digest or password authentication for RTSP in the camera configuration portal.",
                component="192.168.1.78:554",
                detected_at=now
            )
            findings.extend([f1, f2])
            step.findings_generated.extend([f1.id, f2.id])

        elif step.id == "wifi_weak_auth":
            step.status = "passed"
            step.details = "No default factory credentials identified on standard management endpoints."

        elif step.id == "wifi_iot_vuln":
            step.status = "warning"
            step.details = "IoT Smart Plug running outdated firmware with known UPnP command injection bug."
            f = Finding(
                id="FIND-WIFI-006",
                title="IoT UPnP Remote Control Vulnerability",
                category="IoT Vulnerabilities",
                severity="medium",
                description="Connected smart home plug at 192.168.1.92 accepts unauthenticated UPnP commands that allow remote reboot and state modification.",
                remediation="Update smart plug firmware via companion vendor app or isolate IoT devices on an isolated Guest VLAN.",
                component="192.168.1.92 (SmartPlug)",
                detected_at=now
            )
            findings.append(f)
            step.findings_generated.append(f.id)

        elif step.id == "wifi_cve_lookup":
            step.status = "failed"
            step.details = "Detected vulnerable OpenSSH banner matching Terrapin Attack advisory (CVE-2023-48795)."
            f = Finding(
                id="FIND-WIFI-007",
                title="SSH Protocol Terrapin Attack Vulnerability (CVE-2023-48795)",
                category="Vulnerability Intelligence",
                severity="high",
                description="Host running OpenSSH 8.2 supports ChaCha20-Poly1305 and CBC ciphers with Encrypt-then-MAC, allowing man-in-the-middle attackers to downgrade connection security parameters.",
                remediation="Upgrade OpenSSH to version 9.6p1 or newer, or disable affected cipher/MAC algorithms.",
                cve_id="CVE-2023-48795",
                cvss_score=8.1,
                component="192.168.1.12:22 (OpenSSH)",
                detected_at=now
            )
            findings.append(f)
            step.findings_generated.append(f.id)

        elif step.id == "wifi_smb_netbios":
            step.status = "warning"
            step.details = "LLMNR and NetBIOS Name Service (NBT-NS) broadcasts active on local network."
            f = Finding(
                id="FIND-WIFI-008",
                title="LLMNR / NBT-NS Name Resolution Poisoning Risk",
                category="Protocol Hardening",
                severity="low",
                description="Workstations broadcast LLMNR and NetBIOS queries for unresolved DNS names, allowing an attacker to spoof responses and harvest NTLMv2 challenge-response hashes.",
                remediation="Disable LLMNR via Group Policy and disable NetBIOS over TCP/IP in Network Adapter IPv4 settings.",
                component="Local Subnet Broadcast",
                detected_at=now
            )
            findings.append(f)
            step.findings_generated.append(f.id)

        elif step.id == "wifi_risk_board_agg":
            step.status = "passed"
            step.details = "Consolidated 8 risk vectors across 7 hosts into Risk Board."

        else:
            step.status = "passed"
            step.details = "Check completed successfully."

        return step, findings
