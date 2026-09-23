from typing import Optional
from pydantic import BaseModel

class AuditEntry(BaseModel):
    id: Optional[int] = None
    scan_id: str
    timestamp: str
    target_name: str
    target_identifier: str
    module: str
    depth: str
    authorized_by: str
    organization: str
    score: int
    findings_count: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    info_count: int
    audit_hash: str
    pdf_path: Optional[str] = None
