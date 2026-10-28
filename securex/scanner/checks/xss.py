"""Passive XSS indicators; does not send scripts or execute payloads."""
import re
from scanner.models import Finding

DANGEROUS_SINKS = re.compile(r"\b(?:innerHTML|outerHTML|document\.write\s*\(|insertAdjacentHTML\s*\()", re.I)
INLINE_SCRIPT = re.compile(r"<script\b(?![^>]*\bsrc\s*=)[^>]*>", re.I)

def check_xss_indicators(html: str, headers: dict) -> list[Finding]:
    findings = []
    if DANGEROUS_SINKS.search(html):
        findings.append(Finding(
            id="XSS-client-side-sink", category="XSS", title="Potential client-side HTML injection sink detected",
            severity="LOW", risk="Use of HTML-writing JavaScript APIs can create DOM XSS if untrusted data reaches the sink without safe handling. Static inspection cannot confirm exploitability.",
            fix="Prefer textContent and safe DOM APIs; sanitize any unavoidable HTML with a maintained sanitizer and avoid placing untrusted data into script/HTML contexts.",
            evidence=f"Matched JavaScript sink: {DANGEROUS_SINKS.search(html).group(0)}", confidence="heuristic", status="Review"))
    if INLINE_SCRIPT.search(html) and not any(k.lower() == "content-security-policy" for k in headers):
        findings.append(Finding(
            id="XSS-inline-script-no-csp", category="XSS", title="Inline scripts present without Content-Security-Policy",
            severity="LOW", risk="A restrictive CSP can reduce the impact of some XSS attacks. Inline scripts alone do not prove an XSS vulnerability.",
            fix="Deploy a tested Content-Security-Policy, preferably using nonces or hashes, and reduce unsafe-inline where possible.",
            evidence="Inline script element detected and Content-Security-Policy header is absent.", confidence="heuristic", status="Review"))
    return findings
