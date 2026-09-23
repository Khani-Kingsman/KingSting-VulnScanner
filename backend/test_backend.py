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
    assert len(android_steps) >= 10, "Expected >=10 steps for Android Deep"

    wireless_steps = scan_manager.get_planned_steps("wireless", "standard")
    print(f"Wireless Standard Steps: {len(wireless_steps)}")
    assert len(wireless_steps) >= 7, "Expected >=7 steps for Wireless Standard"

    ios_steps = scan_manager.get_planned_steps("ios", "quick")
    print(f"iOS Quick Steps: {len(ios_steps)}")
    assert len(ios_steps) >= 4, "Expected >=4 steps for iOS Quick"

    print("2. Testing Scan Lifecycle Execution (simulated Android Quick)...")
    target = TargetDevice(
        id="test_and_01",
        name="Test Galaxy S23",
        module="android",
        connection_mode="usb",
        ip_or_serial="TEST-SERIAL-1234",
        os_version="Android 13",
        model_name="Galaxy S23",
        vendor="Samsung",
        status="online"
    )

    req = ScanRequest(
        module="android",
        depth="quick",
        target=target,
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
    assert result.score > 0
    assert len(events_received) > 0

    print("3. Testing PDF Generation...")
    pdf_path = generate_pdf_report(result)
    print(f"PDF Generated at: {pdf_path}")
    assert os.path.exists(pdf_path), "PDF file was not created"
    assert os.path.getsize(pdf_path) > 1000, "PDF file is suspiciously small"

    print("4. Testing SQLite Audit Trail...")
    logs = list_audit_entries(10)
    print(f"Audit log entries found: {len(logs)}")
    assert len(logs) >= 1, "Audit log did not record the scan"
    assert logs[0].scan_id == result.scan_id, "Latest audit log does not match scan_id"

    print("\nALL BACKEND CORE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_backend_flow())
