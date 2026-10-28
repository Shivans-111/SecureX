"""Passive injection indicators. Never submits attack payloads or modifies data."""
import re
from scanner.models import Finding

SQL_ERRORS = [
    re.compile(r"SQL syntax.*MySQL|Warning: mysql_", re.I),
    re.compile(r"SQLite\s*3?::?\s*\w+|sqlite3\.OperationalError", re.I),
    re.compile(r"PostgreSQL.*ERROR|pg_query\(\).*failed", re.I),
    re.compile(r"Microsoft OLE DB Provider for SQL Server|Unclosed quotation mark after the character string", re.I),
    re.compile(r"ORA-\d{5}", re.I),
]


def check_injection_indicators(html: str) -> list[Finding]:
    findings = []
    for idx, pattern in enumerate(SQL_ERRORS, start=1):
        match = pattern.search(html)
        if match:
            findings.append(Finding(
                id=f"INJECTION-sql-error-{idx}", category="INJECTION",
                title="Database error details exposed",
                severity="MEDIUM",
                risk="Database error messages can reveal query structure or database technology. This is an indicator, not proof of SQL injection.",
                fix="Return generic errors to users, log details server-side, and use parameterized queries throughout the application.",
                evidence=f"Matched database error signature: {match.group(0)[:120]}",
                confidence="heuristic", status="Review",
            ))
            break
    return findings
