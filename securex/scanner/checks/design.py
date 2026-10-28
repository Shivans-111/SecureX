"""
DESIGN + ACCESS + AUTH categories: passive structural checks from the
homepage response — no active exploitation, just reading what's already there.
"""
import re

from scanner.models import Finding

FORM_RE = re.compile(r"<form[^>]*>", re.I)
PASSWORD_INPUT_RE = re.compile(r"<input[^>]*type=[\"']?password[\"']?", re.I)
ACTION_RE = re.compile(r"action=[\"']([^\"']*)[\"']", re.I)
AUTOCOMPLETE_OFF_RE = re.compile(r"autocomplete=[\"']off[\"']", re.I)
LISTING_RE = re.compile(r"<title>Index of /", re.I)
MIXED_CONTENT_RE = re.compile(r"(?:src|href)=[\"']http://", re.I)


def check_design(html: str, final_url: str, is_https: bool) -> list[Finding]:
    findings = []

    # Directory listing left enabled.
    if LISTING_RE.search(html):
        findings.append(
            Finding(
                id="CONFIG-directory-listing",
                category="CONFIG",
                title="Directory listing appears enabled",
                severity="MEDIUM",
                risk="An exposed directory index can reveal files not meant to be browsed, including "
                     "backups or configuration.",
                fix="Disable directory indexing on the web server (e.g. Options -Indexes in Apache).",
                evidence="Response title matched 'Index of /'.",
                confidence="heuristic",
            )
        )

    # Password form submitted over plain HTTP, or action= pointing at http:// explicitly.
    for form_tag in FORM_RE.findall(html):
        pass  # kept simple: whole-page check below is sufficient for a passive pass

    if PASSWORD_INPUT_RE.search(html):
        action_match = ACTION_RE.search(html)
        action = action_match.group(1) if action_match else ""
        posts_over_http = (not is_https) or action.startswith("http://")
        if posts_over_http:
            findings.append(
                Finding(
                    id="AUTH-password-over-http",
                    category="AUTH",
                    title="Login form may submit credentials over unencrypted HTTP",
                    severity="CRITICAL",
                    risk="Credentials sent over plain HTTP can be intercepted by anyone on the network path.",
                    fix="Serve the login page and its form action exclusively over HTTPS, and redirect all HTTP to HTTPS.",
                    evidence="Password input found on a non-HTTPS context.",
                    confidence="heuristic",
                )
            )

    # Mixed content: HTTPS page pulling http:// sub-resources.
    if is_https and MIXED_CONTENT_RE.search(html):
        findings.append(
            Finding(
                id="CONFIG-mixed-content",
                category="CONFIG",
                title="Mixed content: HTTPS page loads resources over HTTP",
                severity="LOW",
                risk="Resources loaded over HTTP on an HTTPS page can be tampered with in transit and "
                     "may be blocked by modern browsers.",
                fix="Update all asset URLs (scripts, styles, images) to HTTPS or protocol-relative URLs.",
                evidence="Found http:// src/href reference on an https:// page.",
                confidence="heuristic",
            )
        )

    # No HTTPS at all.
    if not is_https:
        findings.append(
            Finding(
                id="CRYPTO-no-https",
                category="CRYPTO",
                title="Site is served over plain HTTP",
                severity="HIGH",
                risk="Without HTTPS, all traffic (including any sensitive data) is sent unencrypted and "
                     "can be intercepted or modified in transit.",
                fix="Deploy a TLS certificate and enforce HTTPS site-wide, including an HTTP->HTTPS redirect.",
                evidence=f"Final URL scheme: {final_url.split('://')[0]}",
            )
        )

    return findings
