import asyncio
import hashlib
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List, Callable
from app.models.scan import ScanRequest, ScanResult, CheckStep, TargetDevice, ScanStatus
from app.models.findings import Finding
from app.models.audit import AuditEntry
from app.engine.real_scanner import RealAndroidScanner, RealWirelessScanner
from app.engine.mock_ios import MockIOSScanner
from app.db.audit_log import record_scan

class ScanSessionManager:
    def __init__(self):
        self.android_scanner = RealAndroidScanner()
        self.wireless_scanner = RealWirelessScanner()
        self.ios_scanner = MockIOSScanner()
        self.active_scans: Dict[str, Dict[str, Any]] = {}
        self.completed_scans: Dict[str, ScanResult] = {}

    def get_scanner(self, module: str):
        if module == "android":
            return self.android_scanner
        elif module == "wireless":
            return self.wireless_scanner
        elif module == "ios":
            return self.ios_scanner
        raise ValueError(f"Unknown scan module: {module}")

    def get_planned_steps(self, module: str, depth: str) -> List[CheckStep]:
        scanner = self.get_scanner(module)
        return scanner.get_steps_for_depth(depth)

    def calculate_score_and_grade(self, findings: List[Finding]) -> tuple[int, str]:
        score = 100
        for f in findings:
            if f.severity == "critical":
                score -= 20
            elif f.severity == "high":
                score -= 12
            elif f.severity == "medium":
                score -= 6
            elif f.severity == "low":
                score -= 2
        score = max(15, min(100, score))

        if score >= 90:
            grade = "A"
        elif score >= 80:
            grade = "B"
        elif score >= 70:
            grade = "C"
        elif score >= 60:
            grade = "D"
        else:
            grade = "F"
        return score, grade

    def generate_audit_hash(self, scan_id: str, timestamp: str, target: TargetDevice, score: int, auditor: str) -> str:
        payload = f"{scan_id}:{timestamp}:{target.id}:{target.ip_or_serial}:{score}:{auditor}:KINGSTING_SECURE"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:32].upper()

    async def _emit_event(self, callback: Optional[Callable], event: Dict[str, Any]):
        if not callback:
            return
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(event)
            else:
                res = callback(event)
                if asyncio.iscoroutine(res):
                    await res
        except Exception as e:
            print(f"Error emitting scan event: {e}")

    async def run_scan_lifecycle(self, scan_request: ScanRequest, event_callback: Optional[Callable[[Dict[str, Any]], Any]] = None) -> ScanResult:
        scan_id = f"KS-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        started_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        scanner = self.get_scanner(scan_request.module)
        steps = scanner.get_steps_for_depth(scan_request.depth)
        total_steps = len(steps)

        self.active_scans[scan_id] = {
            "status": "running",
            "request": scan_request,
            "started_at": started_at,
            "completed_steps": 0,
            "total_steps": total_steps
        }

        await self._emit_event(event_callback, {
            "type": "scan_started",
            "scan_id": scan_id,
            "module": scan_request.module,
            "depth": scan_request.depth,
            "target": scan_request.target.model_dump(),
            "total_steps": total_steps,
            "timestamp": started_at
        })

        completed_steps_list: List[CheckStep] = []
        all_findings: List[Finding] = []

        for idx, step in enumerate(steps):
            step.status = "running"
            await self._emit_event(event_callback, {
                "type": "step_started",
                "scan_id": scan_id,
                "step_index": idx + 1,
                "total_steps": total_steps,
                "step": step.model_dump()
            })

            # Real execution with sub-progress update
            ticks = 2
            tick_time = (step.duration_ms / 1000.0) / ticks
            for t in range(1, ticks + 1):
                await asyncio.sleep(tick_time)
                await self._emit_event(event_callback, {
                    "type": "step_progress",
                    "scan_id": scan_id,
                    "step_id": step.id,
                    "progress": int((t / ticks) * 100)
                })

            # Execute real step
            updated_step, step_findings = scanner.execute_step(step, scan_request.target, scan_request.depth)
            completed_steps_list.append(updated_step)

            for f in step_findings:
                all_findings.append(f)
                await self._emit_event(event_callback, {
                    "type": "finding_discovered",
                    "scan_id": scan_id,
                    "finding": f.model_dump()
                })

            await self._emit_event(event_callback, {
                "type": "step_completed",
                "scan_id": scan_id,
                "step_index": idx + 1,
                "total_steps": total_steps,
                "step": updated_step.model_dump(),
                "findings_count": len(step_findings)
            })

        completed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        score, grade = self.calculate_score_and_grade(all_findings)
        audit_hash = self.generate_audit_hash(scan_id, completed_at, scan_request.target, score, scan_request.authorized_by)

        passed = sum(1 for s in completed_steps_list if s.status == "passed")
        warnings = sum(1 for s in completed_steps_list if s.status == "warning")
        failed = sum(1 for s in completed_steps_list if s.status == "failed")

        crit_count = sum(1 for f in all_findings if f.severity == "critical")
        high_count = sum(1 for f in all_findings if f.severity == "high")
        med_count = sum(1 for f in all_findings if f.severity == "medium")
        low_count = sum(1 for f in all_findings if f.severity == "low")
        info_count = sum(1 for f in all_findings if f.severity == "info")

        summary = (
            f"Audit finished for {scan_request.target.name} ({scan_request.module.upper()}). "
            f"Assigned Security Posture Grade: {grade} ({score}/100). "
            f"Evaluated {total_steps} security controls: {passed} passed, {warnings} advisory warnings, {failed} flagged issues. "
            f"Identified {len(all_findings)} vulnerabilities ({crit_count} Critical, {high_count} High, {med_count} Medium)."
        )

        result = ScanResult(
            scan_id=scan_id,
            module=scan_request.module,
            depth=scan_request.depth,
            target=scan_request.target,
            started_at=started_at,
            completed_at=completed_at,
            status="completed",
            score=score,
            grade=grade,
            total_checks=total_steps,
            passed_checks=passed,
            warning_checks=warnings,
            failed_checks=failed,
            findings=all_findings,
            steps=completed_steps_list,
            summary=summary,
            authorized_by=scan_request.authorized_by,
            organization=scan_request.organization,
            audit_hash=audit_hash
        )

        self.completed_scans[scan_id] = result
        if scan_id in self.active_scans:
            del self.active_scans[scan_id]

        # Record to SQLite audit database
        audit_entry = AuditEntry(
            scan_id=scan_id,
            timestamp=completed_at,
            target_name=scan_request.target.name,
            target_identifier=scan_request.target.ip_or_serial,
            module=scan_request.module,
            depth=scan_request.depth,
            authorized_by=scan_request.authorized_by,
            organization=scan_request.organization,
            score=score,
            findings_count=len(all_findings),
            critical_count=crit_count,
            high_count=high_count,
            medium_count=med_count,
            low_count=low_count,
            info_count=info_count,
            audit_hash=audit_hash,
            pdf_path=None
        )
        record_scan(audit_entry)

        await self._emit_event(event_callback, {
            "type": "scan_completed",
            "scan_id": scan_id,
            "result": result.model_dump()
        })

        return result

scan_manager = ScanSessionManager()
