"""
Shared data shapes for findings and the final report.
Matches the dashboard fields shown in the deck: category, severity,
status, risk text, fix text.
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

# Severity order, matches deck: CRITICAL / HIGH / MEDIUM / LOW
SEVERITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}

# The 12 categories from the deck (OWASP-inspired), used to tag findings.
CATEGORIES = {
    "ACCESS": "Broken access control",
    "CONFIG": "Security misconfiguration",
    "CRYPTO": "Cryptographic failures",
    "COMPONENTS": "Vulnerable / outdated components",
    "INJECTION": "Injection",
    "AUTH": "Identification & authentication failures",
    "DESIGN": "Insecure design",
    "INTEGRITY": "Software / data integrity failures",
    "LOGGING": "Logging & monitoring failures",
    "SSRF": "Server-side request forgery",
    "XSS": "Cross-site scripting",
    "HEADERS": "Security headers & cookie settings",
}


@dataclass
class Finding:
    id: str
    category: str          # one of CATEGORIES keys
    title: str
    severity: str           # CRITICAL / HIGH / MEDIUM / LOW / INFO
    risk: str                # what this means (shown as RISK in deck)
    fix: str                  # remediation text (shown as FIX in deck)
    evidence: Optional[str] = None
    status: str = "Needs fix"  # Needs fix / Review / Tracked / Verified-safe
    confidence: str = "confirmed"  # confirmed | heuristic  -> drives "unverified" language

    def to_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "category_label": CATEGORIES.get(self.category, self.category),
            "title": self.title,
            "severity": self.severity,
            "risk": self.risk,
            "fix": self.fix,
            "evidence": self.evidence,
            "status": self.status,
            "confidence": self.confidence,
            "confidence_label": (
                "Potential — manual verification required"
                if self.confidence == "heuristic"
                else "Confirmed"
            ),
        }


@dataclass
class ScanReport:
    target: str
    started_at: str
    finished_at: Optional[str] = None
    scan_complete: bool = False
    findings: list = field(default_factory=list)
    errors: list = field(default_factory=list)
    checks: list = field(default_factory=list)

    def record_check(self, check_id: str, category: str, name: str, status: str, details: str):
        """Record the execution outcome of an individual security check."""
        self.checks.append({
            "id": check_id,
            "category": category,
            "category_label": CATEGORIES.get(category, category),
            "name": name,
            "status": status,  # "passed" | "finding" | "inconclusive" | "could_not_run"
            "details": details,
        })

    def add(self, finding: Finding):
        """Add finding with deduplication to keep summary counts and score deductions aligned."""
        for existing in self.findings:
            if existing.id == finding.id:
                # Merge evidence if distinct URL or detail was observed
                if finding.evidence and existing.evidence and finding.evidence not in existing.evidence:
                    existing.evidence = f"{existing.evidence}; Also: {finding.evidence}"
                return
        self.findings.append(finding)

    def summary(self):
        counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
        for f in self.findings:
            counts[f.severity] = counts.get(f.severity, 0) + 1
        return {
            "total_findings": len(self.findings),
            "high_priority": counts["CRITICAL"] + counts["HIGH"],
            "by_severity": counts,
        }

    def checks_summary(self):
        passed = sum(1 for c in self.checks if c.get("status") == "passed")
        findings_count = sum(1 for c in self.checks if c.get("status") == "finding")
        inconclusive = sum(1 for c in self.checks if c.get("status") == "inconclusive")
        could_not_run = sum(1 for c in self.checks if c.get("status") == "could_not_run")
        return {
            "total_performed": len(self.checks),
            "passed": passed,
            "findings": findings_count,
            "inconclusive": inconclusive,
            "could_not_run": could_not_run,
            "details": self.checks,
        }

    def to_dict(self):
        sorted_findings = sorted(
            self.findings, key=lambda f: SEVERITY_ORDER.get(f.severity, 99)
        )
        from scanner.scoring import calculate_scan_score
        chk_sum = self.checks_summary()
        performed = chk_sum["total_performed"] if chk_sum["total_performed"] > 0 else (10 if self.scan_complete else 0)
        return {
            "target": self.target,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "scan_complete": self.scan_complete,
            "summary": self.summary(),
            "checks_summary": chk_sum,
            "score": calculate_scan_score(
                self.findings,
                self.scan_complete,
                self.errors,
                checks_performed=performed,
                could_not_run=chk_sum["could_not_run"],
            ),
            "findings": [f.to_dict() for f in sorted_findings],
            "errors": self.errors,
        }




def now_iso():
    return datetime.now(timezone.utc).isoformat()
