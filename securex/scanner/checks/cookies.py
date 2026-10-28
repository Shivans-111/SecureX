"""
HEADERS category (cookie settings) + AUTH: Set-Cookie attribute checks.
"""
from scanner.models import Finding


def check_cookies(set_cookie_headers: list[str], is_https: bool) -> list[Finding]:
    """set_cookie_headers: list of raw Set-Cookie header values from the response."""
    findings = []

    for raw in set_cookie_headers:
        cookie_name = raw.split("=", 1)[0].strip() or "(unnamed)"
        lower = raw.lower()

        if is_https and "secure" not in lower:
            findings.append(
                Finding(
                    id=f"HEADERS-cookie-secure-{cookie_name}",
                    category="HEADERS",
                    title=f"Cookie '{cookie_name}' missing Secure flag",
                    severity="MEDIUM",
                    risk="Without the Secure flag, this cookie could be sent over an unencrypted "
                         "HTTP connection and intercepted.",
                    fix="Add the Secure attribute to this cookie.",
                    evidence=raw[:200],
                )
            )

        if "httponly" not in lower:
            findings.append(
                Finding(
                    id=f"HEADERS-cookie-httponly-{cookie_name}",
                    category="HEADERS",
                    title=f"Cookie '{cookie_name}' missing HttpOnly flag",
                    severity="MEDIUM",
                    risk="Without HttpOnly, this cookie is readable by JavaScript, increasing the "
                         "impact of any XSS vulnerability (session theft).",
                    fix="Add the HttpOnly attribute to this cookie, unless client-side JS genuinely needs it.",
                    evidence=raw[:200],
                )
            )

        if "samesite" not in lower:
            findings.append(
                Finding(
                    id=f"HEADERS-cookie-samesite-{cookie_name}",
                    category="HEADERS",
                    title=f"Cookie '{cookie_name}' missing SameSite attribute",
                    severity="LOW",
                    risk="Without SameSite, this cookie may be sent on cross-site requests, which can "
                         "assist CSRF attacks.",
                    fix="Add SameSite=Lax or SameSite=Strict (use None + Secure only when a cross-site "
                         "use case genuinely requires it).",
                    evidence=raw[:200],
                )
            )

    return findings
