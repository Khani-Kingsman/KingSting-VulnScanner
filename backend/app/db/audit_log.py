import sqlite3
from typing import List, Optional
from datetime import datetime
from app.config import DB_PATH
from app.models.audit import AuditEntry

def get_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id TEXT UNIQUE NOT NULL,
            timestamp TEXT NOT NULL,
            target_name TEXT NOT NULL,
            target_identifier TEXT NOT NULL,
            module TEXT NOT NULL,
            depth TEXT NOT NULL,
            authorized_by TEXT NOT NULL,
            organization TEXT NOT NULL,
            score INTEGER NOT NULL,
            findings_count INTEGER NOT NULL,
            critical_count INTEGER NOT NULL,
            high_count INTEGER NOT NULL,
            medium_count INTEGER NOT NULL,
            low_count INTEGER NOT NULL,
            info_count INTEGER NOT NULL,
            audit_hash TEXT NOT NULL,
            pdf_path TEXT
        )
    """)
    conn.commit()
    conn.close()

def record_scan(entry: AuditEntry) -> int:
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO audit_logs (
            scan_id, timestamp, target_name, target_identifier, module, depth,
            authorized_by, organization, score, findings_count,
            critical_count, high_count, medium_count, low_count, info_count,
            audit_hash, pdf_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        entry.scan_id, entry.timestamp, entry.target_name, entry.target_identifier,
        entry.module, entry.depth, entry.authorized_by, entry.organization,
        entry.score, entry.findings_count, entry.critical_count, entry.high_count,
        entry.medium_count, entry.low_count, entry.info_count, entry.audit_hash,
        entry.pdf_path
    ))
    conn.commit()
    inserted_id = cursor.lastrowid
    conn.close()
    return inserted_id

def list_audit_entries(limit: int = 50) -> List[AuditEntry]:
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [AuditEntry(**dict(row)) for row in rows]

def get_audit_entry(scan_id: str) -> Optional[AuditEntry]:
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs WHERE scan_id = ?", (scan_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return AuditEntry(**dict(row))
    return None
