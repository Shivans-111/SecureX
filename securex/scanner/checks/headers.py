"""
HEADERS category: missing/misconfigured security headers.
This is the exact "Missing security header" example shown in the deck
(Content-Security-Policy not detected -> MEDIUM, configure header, re-test).
"""
from scanner.models import Finding

# header_name -> (severity, risk text, fix text)
SECURITY_HEADERS = {
    "content-security-policy": (
        "MEDIUM",
        "Without a CSP, browser-side protections against script injection (XSS) are reduced.",
        "Configure a Content-Security-Policy header scoped to the origins your app actually needs.",
    ),
    "strict-transport-security": (
        "MEDIUM",
        "Without HSTS, users can be downgraded to plain HTTP and exposed to man-in-the-middle attacks.",
        "Add Strict-Transport-Security with a long max-age (e.g. max-age=31536000; includeSubDomains).",
    ),
    "x-frame-options": (
        "LOW",
        "Without framing protection, the site may be embeddable in a malicious iframe (clickjacking).",
        "Add X-Frame-Options: DENY or SAMEORIGIN, or a frame-ancestors directive in CSP.",
    ),
    "x-content-type-options": (
        "LOW",
        "Without this header, browsers may MIME-sniff responses, enabling some content-spoofing attacks.",
        "Add X-Content-Type-Options: nosniff.",
    ),
    "referrer-policy": (
        "LOW",
        "Without a Referrer-Policy, full URLs (possibly with sensitive query params) can leak to third parties.",
        "Add a Referrer-Policy such as strict-origin-when-cross-origin.",
    ),
    "permissions-policy": (
        "LOW",
        "Without Permissions-Policy, browser features (camera, geolocation, etc.) default to broadly allowed.",
        "Add a Permissions-Policy that disables features the site doesn't use.",
    ),
}

SERVER_LEAK_HEADERS = ("server", "x-powered-by", "x-aspnet-version", "x-aspnetmvc-version")


def check_headers(headers: dict) -> list[Finding]:
    """headers: case-insensitive dict of response headers from the target's homepage."""
    findings = []
    lower_headers = {k.lower(): v for k, v in headers.items()}

    for header_name, (severity, risk, fix) in SECURITY_HEADERS.items():
        if header_name not in lower_headers:
            findings.append(
                Finding(
                    id=f"HEADERS-{header_name}",
                    category="HEADERS",
                    title=f"Missing security header: {header_name}",
                    severity=severity,
                    risk=risk,
                    fix=fix,
                    evidence=f"{header_name}: — not detected",
                )
            )

    # Info-leak via version-revealing headers (also tags as CONFIG).
    for leak_header in SERVER_LEAK_HEADERS:
        if leak_header in lower_headers:
            value = lower_headers[leak_header]
            findings.append(
                Finding(
                    id=f"CONFIG-leak-{leak_header}",
                    category="CONFIG",
                    title=f"Server/technology version disclosed via {leak_header}",
                    severity="LOW",
                    risk="Revealing exact server/framework versions makes it easier for an attacker to "
                         "target known vulnerabilities for that specific version.",
                    fix=f"Suppress or genericize the {leak_header} header at the web server/proxy level.",
                    evidence=f"{leak_header}: {value}",
                )
            )

    return findings
