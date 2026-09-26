import urllib.request
import json
import time

BASE = "http://127.0.0.1:8765"

def run_test():
    print("--- 1. Authorizing Khani-s-S10 for Deep Audit ---")
    auth_payload = json.dumps({
        "ip_or_serial": "192.168.100.54",
        "name": "Khani-s-S10",
        "module": "android",
        "vendor": "Samsung Mobile",
        "model_name": "Galaxy S10",
        "os_version": "Android 10 • Samsung Exynos SM-G973"
    }).encode()
    req = urllib.request.Request(f"{BASE}/api/devices/authorize", data=auth_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        dev_res = json.loads(resp.read().decode())
        target = dev_res.get("device")
        print("Authorized target:", target.get("name"), target.get("ip_or_serial"))

    print("\n--- 2. Starting Deep Android Comprehensive Audit ---")
    scan_payload = json.dumps({
        "target": target,
        "module": "android",
        "depth": "deep",
        "consent_confirmed": True
    }).encode()
    req = urllib.request.Request(f"{BASE}/api/scans/start", data=scan_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        start_res = json.loads(resp.read().decode())
        print("Scan start:", start_res)

    print("\n--- 3. Monitoring Scan Progress until Completion ---")
    completed = False
    for attempt in range(40):
        time.sleep(1)
        req_logs = urllib.request.Request(f"{BASE}/api/audit/logs?limit=1")
        with urllib.request.urlopen(req_logs) as resp:
            logs = json.loads(resp.read().decode())
            if logs and logs[0].get("target_identifier") == "192.168.100.54":
                entry = logs[0]
                scan_id = entry.get("scan_id")
                print(f"Scan finished in {attempt + 1}s! Scan ID: {scan_id}")
                print(f"Score: {entry.get('score')}/100 | Total Findings: {entry.get('findings_count')}")
                print(f"Severity Breakdown: Critical={entry.get('critical_count')}, High={entry.get('high_count')}, Medium={entry.get('medium_count')}")

                # Fetch full scan details
                req_scan = urllib.request.Request(f"{BASE}/api/scans/{scan_id}")
                with urllib.request.urlopen(req_scan) as s_resp:
                    res_scan = json.loads(s_resp.read().decode())
                    findings = res_scan.get("findings", [])
                    print(f"\nCorrelated Findings & CVEs ({len(findings)}):")
                    for f in findings:
                        cve = f" [{f.get('cve_id')}]" if f.get("cve_id") else ""
                        cvss = f" (CVSS: {f.get('cvss_score')})" if f.get("cvss_score") else ""
                        print(f"  * [{f.get('severity').upper()}] {f.get('title')}{cve}{cvss}")
                completed = True
                break

    if not completed:
        print("Scan timed out or did not finish within 40 seconds.")

if __name__ == "__main__":
    run_test()
