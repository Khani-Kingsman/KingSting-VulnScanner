import asyncio
import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from app.config import APP_TITLE, APP_VERSION, API_HOST, API_PORT, DB_PATH
from app.models.scan import ScanRequest, ScanResult, CheckStep, TargetDevice, ScanDepth, ScanModule
from app.models.audit import AuditEntry
from app.engine.live_manager import scan_manager
from app.reports.pdf_generator import generate_pdf_report
from app.db.audit_log import init_db, list_audit_entries, get_audit_entry
from app.discovery.real_detector import (
    detect_android_devices,
    detect_wireless_networks,
    detect_ios_devices,
    connect_adb_wifi,
    pair_adb_wifi,
    generate_mobile_pairing_qr,
    get_local_ip,
    check_ip_liveness,
    delete_device,
    clear_offline_devices,
    REGISTERED_MOBILES
)

init_db()

app = FastAPI(title=APP_TITLE, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections per scan_id
ws_clients: Dict[str, List[WebSocket]] = {}

class WifiAdbRequest(BaseModel):
    ip_port: str

class WifiAdbPairRequest(BaseModel):
    ip_port: str
    pairing_code: str

class MobileRegistrationRequest(BaseModel):
    client_ip: str
    model: str
    vendor: str
    os_version: str
    screen: Optional[str] = None
    hardware: Optional[str] = None
    user_agent: Optional[str] = None
    platform: Optional[str] = None
    network: Optional[str] = None
    custom_target: Optional[str] = None

@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "app": APP_TITLE,
        "version": APP_VERSION,
        "engine": "real_live_audit_engine",
        "db": str(DB_PATH)
    }

@app.get("/api/devices/qr-code")
async def get_mobile_pairing_qr_endpoint():
    """Generates high-contrast cyber QR Code pointing to mobile audit portal."""
    return generate_mobile_pairing_qr(port=API_PORT)

@app.get("/mobile-audit", response_class=HTMLResponse)
async def mobile_audit_portal(request: Request):
    """Serves high-aesthetic mobile web app that fingerprints mobile device and registers it into scanner."""
    template_path = Path(__file__).resolve().parent / "templates" / "mobile_audit.html"
    client_ip = request.client.host if request.client else "192.168.100.31"
    if client_ip in ["127.0.0.1", "::1", "localhost"]:
        client_ip = get_local_ip()

    if template_path.exists():
        content = template_path.read_text(encoding="utf-8")
        content = content.replace("{{CLIENT_IP}}", client_ip)
        return HTMLResponse(content=content)
    
    return HTMLResponse(f"<h3>KING STING Mobile Audit Node</h3><p>Client IP: {client_ip}</p>")

@app.post("/api/devices/register-mobile")
async def register_mobile_endpoint(req: MobileRegistrationRequest):
    """Registers a mobile device fingerprint discovered via wireless QR code scan."""
    data = req.model_dump()
    REGISTERED_MOBILES[req.client_ip] = data
    
    # Broadcast registration event to all listening desktop WebSocket clients
    targets = []
    if "active" in ws_clients:
        targets.extend(ws_clients["active"])
    
    for ws in set(targets):
        try:
            await ws.send_json({
                "type": "device_registered",
                "device": data
            })
        except Exception:
            pass

    dev_title = req.model if req.model.lower().startswith(req.vendor.lower()) else f"{req.vendor} {req.model}"
    return {
        "success": True,
        "message": f"Successfully registered {dev_title} ({req.client_ip}) for defensive audit"
    }

@app.get("/api/devices/registered-mobiles")
async def get_registered_mobiles_endpoint():
    return list(REGISTERED_MOBILES.values())

@app.get("/api/devices/{module}", response_model=List[TargetDevice])
async def get_devices(module: ScanModule):
    """Returns REAL hardware and network devices discovered on this system."""
    if module == "android":
        return detect_android_devices()
    elif module == "wireless":
        return detect_wireless_networks()
    elif module == "ios":
        return detect_ios_devices()
    else:
        raise HTTPException(status_code=400, detail="Invalid scan module")

@app.delete("/api/devices/registered/{device_ip}")
async def delete_registered_mobile_endpoint(device_ip: str):
    """Deletes a registered mobile device by its IP address."""
    success = delete_device(device_ip)
    targets = []
    if "active" in ws_clients:
        targets.extend(ws_clients["active"])
    for ws in set(targets):
        try:
            await ws.send_json({
                "type": "device_removed",
                "device_id": device_ip
            })
        except Exception:
            pass
    return {"success": success, "message": f"Device at {device_ip} removed from scanner"}

@app.delete("/api/devices/{device_id}")
async def delete_device_endpoint(device_id: str):
    """Deletes/dismisses a device from scanner memory, registered mobiles, and host cache."""
    success = delete_device(device_id)
    targets = []
    if "active" in ws_clients:
        targets.extend(ws_clients["active"])
    for ws in set(targets):
        try:
            await ws.send_json({
                "type": "device_removed",
                "device_id": device_id
            })
        except Exception:
            pass
    return {"success": success, "message": f"Device {device_id} removed from scanner"}

@app.post("/api/devices/clear-offline")
async def clear_offline_devices_endpoint():
    """Removes all currently offline devices."""
    count = clear_offline_devices()
    targets = []
    if "active" in ws_clients:
        targets.extend(ws_clients["active"])
    for ws in set(targets):
        try:
            await ws.send_json({
                "type": "devices_cleared",
                "cleared_count": count
            })
        except Exception:
            pass
    return {"success": True, "cleared_count": count, "message": f"Cleared {count} offline devices"}

@app.post("/api/devices/pair-wifi-adb")
async def pair_wifi_adb_endpoint(req: WifiAdbPairRequest):
    """Pairs with an Android device wirelessly using a 6-digit pairing code (Android 11+)."""
    return pair_adb_wifi(req.ip_port, req.pairing_code)

@app.post("/api/devices/connect-wifi-adb")
async def connect_wifi_adb_endpoint(req: WifiAdbRequest):
    """Attempts real wireless ADB connection to target IP:Port."""
    result = connect_adb_wifi(req.ip_port)
    return result

@app.get("/api/scans/steps/{module}/{depth}", response_model=List[CheckStep])
async def get_scan_steps(module: ScanModule, depth: ScanDepth):
    return scan_manager.get_planned_steps(module, depth)

@app.post("/api/scans/start")
async def start_scan(request: ScanRequest):
    if not request.consent_confirmed:
        raise HTTPException(
            status_code=403,
            detail="Scan denied: Explicit authorization & ownership consent is required before auditing."
        )

    # Dispatch events via WebSocket
    async def event_dispatcher(event: Dict[str, Any]):
        scan_id = event.get("scan_id")
        # Broadcast to both active listeners and specific scan_id
        targets = []
        if scan_id and scan_id in ws_clients:
            targets.extend(ws_clients[scan_id])
        if "active" in ws_clients:
            targets.extend(ws_clients["active"])

        disconnected = []
        for ws in set(targets):
            try:
                await ws.send_json(event)
            except Exception:
                disconnected.append(ws)

        for d in disconnected:
            for k in list(ws_clients.keys()):
                if d in ws_clients[k]:
                    ws_clients[k].remove(d)

    asyncio.create_task(scan_manager.run_scan_lifecycle(request, event_dispatcher))

    return {
        "status": "initiated",
        "message": f"Real scan initiated for {request.target.name}",
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
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        if scan_id in ws_clients and websocket in ws_clients[scan_id]:
            ws_clients[scan_id].remove(websocket)
            if not ws_clients[scan_id]:
                del ws_clients[scan_id]

DIST_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # Do not intercept API or WebSocket paths
    if full_path.startswith("api") or full_path.startswith("ws"):
        raise HTTPException(status_code=404, detail="Not Found")
    
    file_path = DIST_DIR / full_path
    if full_path and file_path.is_file():
        return FileResponse(file_path)
    
    index_file = DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
        
    return {"message": "KING STING VULNScanner API Server", "status": "online"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=API_HOST, port=API_PORT, reload=True)
