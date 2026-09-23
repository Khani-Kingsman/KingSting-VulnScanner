from typing import Optional, Literal
from pydantic import BaseModel, Field

SeverityLevel = Literal["critical", "high", "medium", "low", "info"]

class Finding(BaseModel):
    id: str
    title: str
    category: str
    severity: SeverityLevel
    description: str
    remediation: str
    cve_id: Optional[str] = None
    cvss_score: Optional[float] = None
    component: str = "System"
    detected_at: Optional[str] = None
