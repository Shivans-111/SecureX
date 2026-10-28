"""Simple SQLite scan-history persistence for the demo backend."""
import json
import os
import sqlite3
from pathlib import Path

DB_PATH = Path(os.getenv("SECUREX_DB_PATH", str(Path(__file__).resolve().parent.parent / "securex_scans.sqlite3")))

def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("CREATE TABLE IF NOT EXISTS scans (id INTEGER PRIMARY KEY AUTOINCREMENT, target TEXT NOT NULL, started_at TEXT, finished_at TEXT, report_json TEXT NOT NULL)")
    conn.commit()
    return conn

def save_report(report: dict) -> int:
    conn = _connect()
    try:
        cur = conn.execute("INSERT INTO scans(target, started_at, finished_at, report_json) VALUES (?, ?, ?, ?)",
            (report.get("target", ""), report.get("started_at"), report.get("finished_at"), json.dumps(report)))
        conn.commit()
        return int(cur.lastrowid)
    finally: conn.close()

def list_scans(limit: int = 20) -> list[dict]:
    conn = _connect()
    try:
        rows = conn.execute("SELECT id, target, started_at, finished_at, report_json FROM scans ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        items = []
        for r in rows:
            data = json.loads(r[4])
            items.append({
                "scan_id": r[0],
                "target": r[1],
                "started_at": r[2],
                "finished_at": r[3],
                "summary": data.get("summary", {}),
                "score": data.get("score"),
            })
        return items
    finally: conn.close()

def get_scan(scan_id: int):
    conn = _connect()
    try:
        row = conn.execute("SELECT report_json FROM scans WHERE id = ?", (scan_id,)).fetchone()
        if not row: return None
        result = json.loads(row[0])
        result["scan_id"] = scan_id
        if "score" not in result:
            from scanner.scoring import calculate_scan_score
            result["score"] = calculate_scan_score(
                result.get("findings", []),
                result.get("scan_complete", True),
                result.get("errors", []),
            )
        return result
    finally: conn.close()
