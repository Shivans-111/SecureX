"""
Scoring model for Secure X vulnerability scans.
Calculates Estimated Website Safety Score and Assessed Security Risk Score.

Methodology:
- Deterministic severity-weighted scoring:
  * CRITICAL: 25.0 points
  * HIGH: 15.0 points
  * MEDIUM: 6.0 points
  * LOW: 2.0 points
  * INFO: 0.0 points
- Heuristic / Unverified multiplier:
  * Findings flagged as confidence='heuristic' receive a 0.4x weight factor because
    passive cues indicate potential risk that requires manual verification, not confirmed exploits.
- Finding deduplication:
  * Equivalent findings across crawled subpages (e.g. repeated missing headers or form signals)
    are deduplicated by finding ID so identical issues do not repeatedly penalize the domain.
- Normalization:
  * Assessed Security Risk Score = min(100, max(0, round(raw_risk_score)))
  * Estimated Website Safety Score = 100 - Assessed Security Risk Score
- Scan validation:
  * If the scan failed, was stopped by scope safety checks, or returned incomplete data,
    status is marked 'unavailable' or 'preliminary' instead of presenting a misleading percentage.
"""
from typing import Any, Dict, List, Optional

SEVERITY_WEIGHTS = {
    "CRITICAL": 25.0,
    "HIGH": 15.0,
    "MEDIUM": 6.0,
    "LOW": 2.0,
    "INFO": 0.0,
}

HEURISTIC_WEIGHT_FACTOR = 0.4  # Reduced weight for unverified potential findings


LIMITATION_STATEMENT = (
    "Scores are estimates based on the checks performed. They do not guarantee that a website is secure or "
    "establish the probability that it will be hacked."
)


def calculate_scan_score(
    findings: List[Any],
    scan_complete: bool = True,
    errors: Optional[List[str]] = None,
    checks_performed: int = 10,
    could_not_run: int = 0,
) -> Dict[str, Any]:
    """Calculate deterministic website safety and security risk scores."""
    # Handle failed or stopped scans
    if not scan_complete or (errors and len(errors) > 0 and len(findings) == 0):
        return {
            "status": "unavailable",
            "safety_score": None,
            "risk_score": None,
            "score_label": "Score unavailable",
            "risk_label": "Risk unavailable",
            "rating": "Unavailable",
            "confidence_indicator": "Scan Incomplete / Stopped",
            "deduplicated_findings_count": 0,
            "raw_risk_score": 0.0,
            "heuristic_count": 0,
            "confirmed_count": 0,
            "limitation_statement": LIMITATION_STATEMENT,
            "explanation": (
                "Score is unavailable because the scan did not complete or was stopped by scope safety boundaries. "
                f"{LIMITATION_STATEMENT}"
            ),
            "methodology": (
                "Severity weights: Critical = 25 pts, High = 15 pts, Medium = 6 pts, Low = 2 pts, Info = 0 pts. "
                "Potential / heuristic findings receive a 0.4x weighting factor. "
                "Equivalent findings across crawled pages are deduplicated. Safety = 100 - Risk."
            ),
        }

    # Deduplicate findings by finding ID
    seen_ids = set()
    deduped_findings = []
    for f in findings:
        f_id = f.get("id") if isinstance(f, dict) else getattr(f, "id", None)
        if not f_id:
            title = f.get("title") if isinstance(f, dict) else getattr(f, "title", "")
            cat = f.get("category") if isinstance(f, dict) else getattr(f, "category", "")
            f_id = f"{cat}:{title}"
        if f_id not in seen_ids:
            seen_ids.add(f_id)
            deduped_findings.append(f)

    raw_risk = 0.0
    heuristic_count = 0
    confirmed_count = 0

    for f in deduped_findings:
        sev = (f.get("severity") if isinstance(f, dict) else getattr(f, "severity", "LOW")) or "LOW"
        conf = (f.get("confidence") if isinstance(f, dict) else getattr(f, "confidence", "confirmed")) or "confirmed"
        base_weight = SEVERITY_WEIGHTS.get(sev.upper(), 2.0)

        if conf == "heuristic":
            weight = base_weight * HEURISTIC_WEIGHT_FACTOR
            heuristic_count += 1
        else:
            weight = base_weight
            confirmed_count += 1

        raw_risk += weight

    risk_score = min(100, max(0, round(raw_risk)))
    safety_score = max(0, min(100, 100 - risk_score))

    # Rating categorization
    if safety_score >= 85:
        rating = "Strong Posture (Low Risk)"
    elif safety_score >= 65:
        rating = "Moderate Posture (Medium Risk)"
    elif safety_score >= 40:
        rating = "Elevated Risk Posture"
    else:
        rating = "High Risk Posture"

    is_insufficient = checks_performed < 5 or could_not_run >= 4

    return {
        "status": "insufficient_evidence" if is_insufficient else "available",
        "safety_score": safety_score,
        "risk_score": risk_score,
        "score_label": "Estimated score based on checks performed",
        "risk_label": "Assessed Security Risk",
        "rating": rating,
        "confidence_indicator": (
            "Insufficient evidence — too few checks completed"
            if is_insufficient
            else "Evaluated against passive diagnostic checks"
        ),
        "deduplicated_findings_count": len(deduped_findings),
        "raw_risk_score": round(raw_risk, 1),
        "heuristic_count": heuristic_count,
        "confirmed_count": confirmed_count,
        "checks_performed": checks_performed,
        "could_not_run": could_not_run,
        "limitation_statement": LIMITATION_STATEMENT,
        "explanation": (
            f"{LIMITATION_STATEMENT} This deterministic score models passive posture from the observed "
            "security indicators and does not replace authenticated application security testing."
        ),
        "methodology": (
            "Deterministic severity formula: Raw Risk = Sum(Severity Base Weight * Confidence Factor). "
            "Severity weights: Critical = 25 pts, High = 15 pts, Medium = 6 pts, Low = 2 pts, Info = 0 pts. "
            "Confirmed findings receive 1.0x factor; Potential / heuristic observations receive 0.4x factor because passive cues require developer verification. "
            "Equivalent findings across crawled pages are deduplicated. "
            "Assessed Security Risk = min(100, max(0, round(raw_risk))). Estimated Website Safety = 100 - Assessed Security Risk."
        ),
    }

