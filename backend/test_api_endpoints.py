import urllib.request
import json
import time

BASE = "http://127.0.0.1:8765"

def test_endpoints():
    print("--- 1. Testing /api/devices/wireless ---")
    req = urllib.request.Request(f"{BASE}/api/devices/wireless")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"Discovered {len(data)} wireless/subnet devices:")
        for d in data:
            print(f"  - {d.get('name')} | IP: {d.get('ip_or_serial')} | Status: {d.get('status')}")

    print("\n--- 2. Testing /api/devices/notify-audit ---")
    payload = json.dumps({"ip_or_serial": "192.168.100.54", "name": "Khani-s-S10"}).encode()
    req = urllib.request.Request(f"{BASE}/api/devices/notify-audit", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("Notify response:", res)

    print("\n--- 3. Testing /api/devices/authorize ---")
    auth_payload = json.dumps({
        "ip_or_serial": "192.168.100.54",
        "name": "Khani-s-S10 (Galaxy S10)",
        "module": "android",
        "vendor": "Samsung"
    }).encode()
    req = urllib.request.Request(f"{BASE}/api/devices/authorize", data=auth_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("Authorize response:", res)

    print("\n--- 4. Testing /api/devices/authorized ---")
    req = urllib.request.Request(f"{BASE}/api/devices/authorized")
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print(f"Authorized targets count: {len(res)}")
        for d in res:
            print(f"  - {d.get('name')} | IP: {d.get('ip_or_serial')} | Status: {d.get('status')}")

    print("\n--- 5. Testing /api/scans/steps/android/deep ---")
    req = urllib.request.Request(f"{BASE}/api/scans/steps/android/deep")
    with urllib.request.urlopen(req) as resp:
        steps = json.loads(resp.read().decode())
        print(f"Loaded {len(steps)} planned deep check steps:")
        for s in steps:
            print(f"  [{s.get('id')}] {s.get('name')}")

if __name__ == "__main__":
    test_endpoints()
