import urllib.request
import json
import time

BASE = "http://127.0.0.1:8765"

def run_deep_scan():
    print("Initiating Deep Scan on Khani-s-S10 (192.168.100.54)...")
    payload = json.dumps({
        "target": {
            "id": "auth_192_168_100_54",
            "name": "Khani-s-S10",
            "module": "android",
            "connection_mode": "network",
            "ip_or_serial": "192.168.100.54",
            "os_version": "Android 10 • Samsung SM-G973",
            "model_name": "Galaxy S10",
            "vendor": "Samsung",
            "status": "online"
        },
        "module": "android",
        "depth": "deep",
        "consent_confirmed": True
    }).encode()

    req = urllib.request.Request(f"{BASE}/api/scans/start", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("Scan start response:", res)

    # Poll for completion (give it up to 20 seconds for deep scan)
    print("Waiting for scan lifecycle to complete...")
    time.sleep(15)

    # Check audit logs for the completed scan
    req_logs = urllib.request.Request(f"{BASE}/api/audit/logs?limit=1")
    with urllib.request.urlopen(req_logs) as resp:
        logs = json.loads(resp.read().decode())
        if logs:
            entry = logs[0]
            print("\n=== Scan Completed Successfully ===")
            print(f"Target: {entry.get('target_name')} ({entry.get('target_ip')})")
            print(f"Risk Score: {entry.get('risk_score')}/100")
            print(f"Total Findings: {entry.get('findings_count')}")
            print(f"Severity Breakdown: Critical={entry.get('critical_count')}, High={entry.get('high_count')}, Medium={entry.get('medium_count')}, Low={entry.get('low_count')}")
            
            # Retrieve full scan result with findings
            scan_id = entry.get("scan_id")
            req_res = urllib.request.Request(f"{BASE}/api/scans/{scan_id}")
            with urllib.request.urlopen(req_res) as r_resp:
                result = json.loads(r_resp.read().decode())
                findings = result.get("findings", [])
                print(f"\nCorrelated Findings & CVEs ({len(findings)}):")
                for f in findings:
                    cve = f" [{f.get('cve_id')}]" if f.get("cve_id") else ""
                    cvss = f" (CVSS: {f.get('cvss_score')})" if f.get("cvss_score") else ""
                    print(f"  * [{f.get('severity').upper()}] {f.get('title')}{cve}{cvss}")

if __name__ == "__main__":
    run_deep_scan()
