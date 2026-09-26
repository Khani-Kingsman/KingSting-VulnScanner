import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.models.scan import ScanRequest, TargetDevice
from app.engine.live_manager import scan_manager
from app.reports.pdf_generator import generate_pdf_report
from app.db.audit_log import list_audit_entries
import asyncio

async def test_backend_flow():
    print("1. Testing Scanner Steps...")
    android_steps = scan_manager.get_planned_steps("android", "deep")
    print(f"Android Deep Steps: {len(android_steps)}")
    assert len(android_steps) >= 8, "Expected >=8 steps for Android Deep"

    wireless_steps = scan_manager.get_planned_steps("wireless", "standard")
    print(f"Wireless Standard Steps: {len(wireless_steps)}")
    assert len(wireless_steps) >= 5, "Expected >=5 steps for Wireless Standard"

    ios_steps = scan_manager.get_planned_steps("ios", "quick")
    print(f"iOS Quick Steps: {len(ios_steps)}")
    assert len(ios_steps) >= 3, "Expected >=3 steps for iOS Quick"

    print("2. Testing Pre-Flight Target Liveness Probe (Offline Target)...")
    offline_target = TargetDevice(
        id="offline_test",
        name="Offline Ghost Device",
        module="android",
        connection_mode="network",
        ip_or_serial="192.0.2.99",
        status="offline"
    )
    offline_req = ScanRequest(
        module="android",
        depth="quick",
        target=offline_target,
        consent_confirmed=True
    )
    offline_events = []
    async def offline_handler(evt):
        offline_events.append(evt.get("type"))

    offline_result = await scan_manager.run_scan_lifecycle(offline_req, offline_handler)
    print(f"Offline Halt Result: Status={offline_result.status}, Events={offline_events}")
    assert offline_result.status == "failed", "Expected scan on offline target to fail during pre-flight"
    assert "scan_failed" in offline_events, "Expected scan_failed event for offline target"

    print("3. Testing Scan Lifecycle Execution on Reachable Target...")
    live_target = TargetDevice(
        id="test_live_gw",
        name="Local Gateway Interface",
        module="wireless",
        connection_mode="network",
        ip_or_serial="127.0.0.1",
        os_version="Gateway Access Point",
        status="online"
    )

    req = ScanRequest(
        module="wireless",
        depth="quick",
        target=live_target,
        authorized_by="Antigravity Test Auditor",
        organization="Test Security Lab",
        consent_confirmed=True
    )

    events_received = []
    async def event_handler(evt):
        events_received.append(evt.get("type"))

    result = await scan_manager.run_scan_lifecycle(req, event_handler)
    print(f"Scan Completed: ID={result.scan_id}, Score={result.score}, Grade={result.grade}, Findings={len(result.findings)}")
    print(f"Events Captured: {len(events_received)} -> {set(events_received)}")
    assert result.status == "completed"
    assert result.score > 0
    assert "scan_completed" in events_received

    print("4. Testing Device Deletion...")
    from app.discovery.real_detector import delete_device, REGISTERED_MOBILES
    REGISTERED_MOBILES["192.0.2.245"] = {"client_ip": "192.0.2.245", "model": "Test Phone"}
    assert "192.0.2.245" in REGISTERED_MOBILES
    delete_device("192.0.2.245")
    assert "192.0.2.245" not in REGISTERED_MOBILES
    print("Device deletion verified successfully!")

    print("5. Testing PDF Generation...")
    pdf_path = generate_pdf_report(result)
    print(f"PDF Generated at: {pdf_path}")
    assert os.path.exists(pdf_path), "PDF file was not created"
    assert os.path.getsize(pdf_path) > 1000, "PDF file is suspiciously small"

    print("6. Testing SQLite Audit Trail...")
    logs = list_audit_entries(10)
    print(f"Audit log entries found: {len(logs)}")
    assert len(logs) >= 1, "Audit log did not record the scan"
    assert logs[0].scan_id == result.scan_id, "Latest audit log does not match scan_id"

    print("\nALL BACKEND CORE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_backend_flow())
