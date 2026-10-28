"""
CONFIG + LOGGING categories: passive info-leak and misconfiguration checks.
Looks at page content and a short list of commonly-exposed paths.
All requests here are plain GETs — no fuzzing, no destructive payloads.
Preserves technical evidence and prevents false positives on generic fallback responses.
"""
import re
import uuid
import httpx
from scanner.models import Finding
from scanner.safety import ScopeError, safe_get

# Paths that, if publicly readable, commonly leak sensitive info.
# Kept short and non-invasive on purpose (hackathon-safe, non-destructive).
SENSITIVE_PATHS = [
    (".env", "Environment file"),
    (".git/config", "Exposed .git directory"),
    ("wp-config.php.bak", "Backup of WordPress config"),
    (".well-known/security.txt", None),  # informational only, not a finding if missing
]

ERROR_SIGNATURES = [
    (re.compile(r"Warning: .*on line \d+", re.I), "PHP warning/stack trace leaked in response"),
    (re.compile(r"Traceback \(most recent call last\)", re.I), "Python traceback leaked in response"),
    (re.compile(r"at System\.\w+", re.I), ".NET stack trace leaked in response"),
    (re.compile(r"org\.apache\.\w+Exception", re.I), "Java/Apache stack trace leaked in response"),
]

ENV_PATTERN = re.compile(
    r"(?m)^\s*(?:APP_|DB_|DATABASE_|SECRET_|API_|AWS_|MAIL_|PORT|HOST|NODE_ENV|DEBUG|KEY|TOKEN)[A-Z0-9_]*\s*=\s*.+"
)

HTML_MARKERS = (
    "<!doctype html",
    "<html",
    "<head",
    "<body",
    "<title",
    "<div id=\"root\"",
    "<div id=\"app\"",
    "<div id=\"__next\"",
    "<script",
)

GENERIC_ERROR_MARKERS = (
    "404 not found",
    "page not found",
    "cannot get",
    "route not found",
    "the requested url was not found",
    "error 404",
    "does not exist",
    "default backend - 404",
    "no route matched",
    "unauthorized",
    "access denied",
    "forbidden",
    "\"detail\":\"not found\"",
    "\"message\":\"not found\"",
    "\"error\":404",
    "\"status\":404",
)


def is_html_response(content_type: str, text_preview: str) -> bool:
    ct = (content_type or "").lower()
    if "text/html" in ct or "application/xhtml+xml" in ct:
        return True
    lower = text_preview.lower().strip()
    return any(marker in lower for marker in HTML_MARKERS)


def is_generic_error(text_preview: str) -> bool:
    lower = text_preview.lower().strip()
    return any(marker in lower for marker in GENERIC_ERROR_MARKERS)


def extract_title(text: str) -> str:
    match = re.search(r"<title[^>]*>(.*?)</title>", text, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip().lower() if match else ""


async def check_info_leak(client: httpx.AsyncClient, base_url: str, homepage_body: str) -> list[Finding]:
    findings = []
    base = base_url.rstrip("/")

    # 1. Error/stack-trace signatures on the homepage itself.
    for pattern, label in ERROR_SIGNATURES:
        match = pattern.search(homepage_body)
        if match:
            findings.append(
                Finding(
                    id=f"LOGGING-error-leak-{label[:20]}",
                    category="LOGGING",
                    title=label,
                    severity="MEDIUM",
                    risk="Detailed error output can reveal file paths, framework versions, or query structure useful to an attacker, suggesting verbose errors are enabled in production.",
                    fix="Disable verbose/debug error output in production; log details server-side only.",
                    evidence=f"Matched error pattern in homepage body: {match.group(0)[:120]}",
                    confidence="heuristic",
                    status="Review",
                )
            )

    # 2. Probe for SPA catch-all or fallback behavior
    probe_id = uuid.uuid4().hex[:12]
    is_catch_all = False
    fallback_lengths = []
    fallback_titles = set()

    for probe_path in (f"_securex_leak_probe_{probe_id}", f"_securex_leak_{probe_id}.env"):
        try:
            probe_resp = await safe_get(client, f"{base}/{probe_path}", timeout=5)
            if probe_resp.status_code == 200:
                ct = probe_resp.headers.get("content-type", "").lower()
                text_prev = probe_resp.text[:3000].lower()
                if is_html_response(ct, text_prev) or is_generic_error(text_prev):
                    is_catch_all = True
                    fallback_lengths.append(len(probe_resp.content))
                    t = extract_title(probe_resp.text[:3000])
                    if t:
                        fallback_titles.add(t)
        except (httpx.HTTPError, ScopeError):
            pass

    # 3. A short list of commonly-exposed sensitive paths (non-destructive GET only).
    for path, label in SENSITIVE_PATHS:
        url = f"{base}/{path}"
        try:
            resp = await safe_get(client, url, timeout=6)
        except (httpx.HTTPError, ScopeError):
            continue

        if path == ".well-known/security.txt":
            # Informational only, not a security finding
            continue

        if resp.status_code != 200 or not resp.content:
            continue

        # If redirected to another path (e.g. login, home, or 404), skip
        if resp.url.path.rstrip("/") != f"/{path}".rstrip("/"):
            continue

        content_type = resp.headers.get("content-type", "").lower()
        content = resp.content
        text_preview = resp.text[:4000].strip()
        lower_text = text_preview.lower()
        resp_title = extract_title(text_preview)

        is_html = is_html_response(content_type, text_preview)
        is_err = is_generic_error(text_preview)
        is_structured_api = any(t in content_type for t in ("application/json", "application/xml", "image/"))

        # HTML pages, generic errors, or structured API JSON responses are never raw config files
        if is_html or is_err or is_structured_api:
            continue

        # Check if response matches known catch-all fallback
        if is_catch_all:
            if resp_title and resp_title in fallback_titles:
                continue
            if any(abs(len(content) - flen) < 250 for flen in fallback_lengths):
                continue

        # Validate real file signatures
        if path == ".env":
            has_env_keys = bool(ENV_PATTERN.search(text_preview))
            # Also check for multiple general assignments
            assign_count = len(re.findall(r"(?m)^[A-Z0-9_]{2,30}\s*=\s*.+", text_preview))
            is_valid_env = has_env_keys or assign_count >= 2

            if is_valid_env:
                findings.append(
                    Finding(
                        id="CONFIG-exposed-env",
                        category="CONFIG",
                        title="Environment file (.env) publicly accessible",
                        severity="CRITICAL",
                        risk="A publicly readable .env file was confirmed with valid environment variable assignments. This file commonly contains database credentials, API keys, and application secrets.",
                        fix="Remove or block public access to .env immediately. Ensure web server rules block access to hidden files and rotate any exposed secrets.",
                        evidence=f"GET {url} returned HTTP 200 ({len(content)} bytes, verified KEY=VALUE environment syntax).",
                        confidence="confirmed",
                        status="Needs fix",
                    )
                )
            else:
                findings.append(
                    Finding(
                        id="CONFIG-potential-env",
                        category="CONFIG",
                        title="Potential environment file reachable: /.env (unverified)",
                        severity="LOW",
                        risk="GET /.env returned HTTP 200 with non-HTML content, but verified environment variable key-value definitions were not identified. Manual verification is required.",
                        fix="Confirm whether /.env contains application secrets or configuration. Deny public access.",
                        evidence=f"GET {url} returned HTTP 200 ({len(content)} bytes, Content-Type: {content_type}). Standard environment syntax not confirmed.",
                        confidence="heuristic",
                        status="Review",
                    )
                )

        elif path == ".git/config":
            is_valid_git = "[core]" in lower_text and any(marker in lower_text for marker in ("repositoryformatversion", "filemode", "bare =", '[remote "origin"]'))
            if is_valid_git:
                findings.append(
                    Finding(
                        id="CONFIG-exposed-git-config",
                        category="CONFIG",
                        title="Git repository configuration (.git/config) publicly accessible",
                        severity="HIGH",
                        risk="A publicly readable .git/config file was confirmed with Git repository markers, indicating the .git metadata directory is exposed to unauthenticated visitors.",
                        fix="Block public access to the .git directory and all hidden directories at the web server / proxy level.",
                        evidence=f"GET {url} returned HTTP 200 with verified [core] Git repository configuration ({len(content)} bytes).",
                        confidence="confirmed",
                        status="Needs fix",
                    )
                )
            else:
                findings.append(
                    Finding(
                        id="CONFIG-potential-git-config",
                        category="CONFIG",
                        title="Potential Git configuration reachable: /.git/config (unverified)",
                        severity="LOW",
                        risk="GET /.git/config returned HTTP 200 with non-HTML content, but verified Git [core] markers were not identified. Manual verification is required.",
                        fix="Ensure the .git directory is not publicly reachable.",
                        evidence=f"GET {url} returned HTTP 200 ({len(content)} bytes, Content-Type: {content_type}). Git repository markers not confirmed.",
                        confidence="heuristic",
                        status="Review",
                    )
                )

        elif path == "wp-config.php.bak":
            is_valid_wp = ("db_name" in lower_text or "db_password" in lower_text or "auth_key" in lower_text) and ("<?php" in lower_text or "define(" in lower_text)
            if is_valid_wp:
                findings.append(
                    Finding(
                        id="CONFIG-exposed-wp-config-bak",
                        category="CONFIG",
                        title="WordPress configuration backup (wp-config.php.bak) publicly accessible",
                        severity="CRITICAL",
                        risk="A backup copy of wp-config.php was confirmed containing database connection parameters and authentication keys.",
                        fix="Delete or restrict wp-config.php.bak immediately and rotate all database passwords and WordPress salt keys.",
                        evidence=f"GET {url} returned HTTP 200 with WordPress configuration syntax ({len(content)} bytes).",
                        confidence="confirmed",
                        status="Needs fix",
                    )
                )
            else:
                findings.append(
                    Finding(
                        id="CONFIG-potential-wp-config-bak",
                        category="CONFIG",
                        title="Potential configuration backup reachable: /wp-config.php.bak (unverified)",
                        severity="LOW",
                        risk="GET /wp-config.php.bak returned HTTP 200 with non-HTML content, but verified WordPress configuration statements were not identified. Manual verification is required.",
                        fix="Verify that backup configuration files are deleted or restricted from the web root.",
                        evidence=f"GET {url} returned HTTP 200 ({len(content)} bytes, Content-Type: {content_type}). Configuration markers not confirmed.",
                        confidence="heuristic",
                        status="Review",
                    )
                )

    return findings

