import asyncio
import os
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.config import APP_TITLE, APP_VERSION, API_HOST, API_PORT, DB_PATH
from app.models.scan import ScanRequest, ScanResult, CheckStep, TargetDevice, ScanDepth, ScanModule
from app.models.audit import AuditEntry
from app.engine.live_manager import scan_manager
from app.reports.pdf_generator import generate_pdf_report
from app.db.audit_log import init_db, list_audit_entries, get_audit_entry

init_db()

app = FastAPI(title=APP_TITLE, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections per scan_id
ws_clients: Dict[str, List[WebSocket]] = {}

# Mock auto-detected and selectable devices per module
MOCK_DEVICES: Dict[ScanModule, List[TargetDevice]] = {
    "android": [
        TargetDevice(
            id="dev_and_01",
            name="Google Pixel 8 Pro",
            module="android",
            connection_mode="usb",
            ip_or_serial="PIX8P-USBC-8921",
            os_version="Android 14 (UP1A.231005.007)",
            model_name="Pixel 8 Pro (Husky)",
            vendor="Google",
            status="online"
        ),
        TargetDevice(
            id="dev_and_02",
            name="Samsung Galaxy S23 Ultra",
            module="android",
            connection_mode="wifi",
            ip_or_serial="192.168.1.108:5555",
            os_version="Android 13 (OneUI 5.1 / Patch Nov 2023)",
            model_name="SM-S918B",
            vendor="Samsung",
            status="online"
        ),
        TargetDevice(
            id="dev_and_03",
            name="OnePlus 11 5G",
            module="android",
            connection_mode="usb",
            ip_or_serial="OP11-ADB-3301",
            os_version="OxygenOS 14 (Android 14)",
            model_name="CPH2449",
            vendor="OnePlus",
            status="online"
        )
    ],
    "wireless": [
        TargetDevice(
            id="dev_wifi_01",
            name="CyberLab-Operations-5G",
            module="wireless",
            connection_mode="network",
            ip_or_serial="192.168.1.0/24 (Gateway: 192.168.1.1)",
            os_version="WiFi 6 (802.11ax) / WPA2-PSK",
            model_name="ASUS RT-AX88U Pro",
            vendor="ASUS Networking",
            status="online"
        ),
        TargetDevice(
            id="dev_wifi_02",
            name="Corp-BYOD-Segment",
            module="wireless",
            connection_mode="network",
            ip_or_serial="10.0.40.0/24 (VLAN 40)",
            os_version="WPA2-Enterprise (802.1X EAP-TLS)",
            model_name="Ubiquiti UniFi U6-Enterprise",
            vendor="Ubiquiti",
            status="online"
        ),
        TargetDevice(
            id="dev_wifi_03",
            name="Guest-IoT-OpenAccess",
            module="wireless",
            connection_mode="network",
            ip_or_serial="172.16.20.0/24 (Gateway: 172.16.20.1)",
            os_version="Open / Legacy WEP / Captive",
            model_name="TP-Link Archer C7",
            vendor="TP-Link",
            status="online"
        )
    ],
    "ios": [
        TargetDevice(
            id="dev_ios_01",
            name="iPhone 15 Pro Max",
            module="ios",
            connection_mode="usb",
            ip_or_serial="00008130-001249A10E02001C",
            os_version="iOS 17.1.1 (Build 21B91)",
            model_name="iPhone 15 Pro Max (A3106)",
            vendor="Apple Inc.",
            status="online"
        ),
        TargetDevice(
            id="dev_ios_02",
            name="iPad Pro 12.9-inch (6th Gen)",
            module="ios",
            connection_mode="wifi",
            ip_or_serial="00008110-000828D21E80401E",
            os_version="iPadOS 17.4 (Build 21E219)",
            model_name="iPad Pro M2",
            vendor="Apple Inc.",
            status="online"
        ),
        TargetDevice(
            id="dev_ios_03",
            name="iPhone 13 mini",
            module="ios",
            connection_mode="usb",
            ip_or_serial="00008101-000418342E90001E",
            os_version="iOS 16.6.1 (Build 20G81)",
            model_name="iPhone 13 mini (A2628)",
            vendor="Apple Inc.",
            status="online"
        )
    ]
}

@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "app": APP_TITLE,
        "version": APP_VERSION,
        "engine": "simulated_mock_phase1",
        "db": str(DB_PATH)
    }

@app.get("/api/devices/{module}", response_model=List[TargetDevice])
async def get_devices(module: ScanModule):
    if module not in MOCK_DEVICES:
        raise HTTPException(status_code=400, detail="Invalid scan module")
    return MOCK_DEVICES[module]

@app.get("/api/scans/steps/{module}/{depth}", response_model=List[CheckStep])
async def get_scan_steps(module: ScanModule, depth: ScanDepth):
    return scan_manager.get_planned_steps(module, depth)

@app.post("/api/scans/start")
async def start_scan(request: ScanRequest):
    # Enforce §2 Ground Rules: Explicit consent required
    if not request.consent_confirmed:
        raise HTTPException(
            status_code=403,
            detail="Scan denied: Explicit authorization & ownership consent is required before auditing."
        )

    # Spawn background scan execution with WebSocket dispatching
    async def event_dispatcher(event: Dict[str, Any]):
        scan_id = event.get("scan_id")
        if scan_id and scan_id in ws_clients:
            disconnected = []
            for ws in ws_clients[scan_id]:
                try:
                    await ws.send_json(event)
                except Exception:
                    disconnected.append(ws)
            for d in disconnected:
                if d in ws_clients[scan_id]:
                    ws_clients[scan_id].remove(d)

    # Run scan asynchronously
    asyncio.create_task(scan_manager.run_scan_lifecycle(request, event_dispatcher))

    # Calculate preview scan_id or return acknowledgment
    return {
        "status": "initiated",
        "message": f"Scan initiated for {request.target.name}",
        "module": request.module,
        "depth": request.depth
    }

@app.get("/api/scans/{scan_id}")
async def get_scan_result(scan_id: str):
    if scan_id in scan_manager.completed_scans:
        return scan_manager.completed_scans[scan_id]
    elif scan_id in scan_manager.active_scans:
        return {
            "status": "running",
            "scan_id": scan_id,
            "data": scan_manager.active_scans[scan_id]
        }
    else:
        # Check SQLite db
        entry = get_audit_entry(scan_id)
        if entry:
            return {"status": "archived", "entry": entry}
        raise HTTPException(status_code=404, detail="Scan ID not found")

@app.get("/api/scans/{scan_id}/pdf")
async def download_scan_pdf(scan_id: str):
    scan_result = scan_manager.completed_scans.get(scan_id)
    if not scan_result:
        raise HTTPException(status_code=404, detail="Active completed scan result not found in memory")
    
    pdf_path = generate_pdf_report(scan_result)
    scan_result.pdf_report_path = pdf_path
    
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=os.path.basename(pdf_path)
    )

@app.get("/api/audit/logs", response_model=List[AuditEntry])
async def get_audit_logs(limit: int = Query(50, ge=1, le=200)):
    return list_audit_entries(limit=limit)

@app.websocket("/ws/scans/{scan_id}")
async def websocket_scan_endpoint(websocket: WebSocket, scan_id: str):
    await websocket.accept()
    if scan_id not in ws_clients:
        ws_clients[scan_id] = []
    ws_clients[scan_id].append(websocket)

    try:
        # Keep socket open and listen for client heartbeat or cancellation
        while True:
            data = await websocket.receive_text()
            # Respond to ping
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        if scan_id in ws_clients and websocket in ws_clients[scan_id]:
            ws_clients[scan_id].remove(websocket)
            if not ws_clients[scan_id]:
                del ws_clients[scan_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=API_HOST, port=API_PORT, reload=True)
