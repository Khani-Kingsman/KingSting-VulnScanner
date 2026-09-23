from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from app.models.findings import Finding

ScanModule = Literal["android", "wireless", "ios"]
ScanDepth = Literal["quick", "standard", "deep"]
ScanStatus = Literal["idle", "initializing", "running", "completed", "failed", "cancelled"]
CheckStatus = Literal["pending", "running", "passed", "warning", "failed"]

class TargetDevice(BaseModel):
    id: str
    name: str
    module: ScanModule
    connection_mode: Literal["usb", "wifi", "network", "manual"] = "usb"
    ip_or_serial: str
    os_version: Optional[str] = None
    model_name: Optional[str] = None
    vendor: Optional[str] = None
    status: Literal["online", "offline", "unauthorized"] = "online"

class CheckStep(BaseModel):
    id: str
    name: str
    description: str
    category: str
    status: CheckStatus = "pending"
    duration_ms: int = 1200
    details: Optional[str] = None
    findings_generated: List[str] = Field(default_factory=list)

class ScanRequest(BaseModel):
    module: ScanModule
    depth: ScanDepth
    target: TargetDevice
    authorized_by: str = "Authorized Security Auditor"
    organization: str = "Internal BYOD / Security Program"
    consent_confirmed: bool = False

class ScanResult(BaseModel):
    scan_id: str
    module: ScanModule
    depth: ScanDepth
    target: TargetDevice
    started_at: str
    completed_at: str
    status: ScanStatus = "completed"
    score: int = Field(ge=0, le=100)
    grade: str = "B"
    total_checks: int
    passed_checks: int
    warning_checks: int
    failed_checks: int
    findings: List[Finding] = Field(default_factory=list)
    steps: List[CheckStep] = Field(default_factory=list)
    summary: str
    authorized_by: str
    organization: str
    audit_hash: str
    pdf_report_path: Optional[str] = None
