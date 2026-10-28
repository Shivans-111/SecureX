"""
Non-invasive access-control exposure checks using a focused list of common paths.
Distinguishes HTTP reachability from confirmed sensitive data exposure,
detects SPA catch-alls / generic HTML fallback pages, and preserves technical evidence.
"""
import re
import uuid
import httpx
from scanner.models import Finding
from scanner.safety import ScopeError, safe_get

DIAGNOSTIC_PATHS = ("backup.zip", "backup.sql", "debug", "server-status")

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
    """Determine whether the response is an HTML web page rather than a raw file."""
    ct = (content_type or "").lower()
    if "text/html" in ct or "application/xhtml+xml" in ct:
        return True
    lower = text_preview.lower().strip()
    return any(marker in lower for marker in HTML_MARKERS)


def is_generic_error_or_not_found(text_preview: str) -> bool:
    """Determine if response text is a generic error or soft-404 error message."""
    lower = text_preview.lower().strip()
    return any(marker in lower for marker in GENERIC_ERROR_MARKERS)


def extract_title(text: str) -> str:
    """Extract <title> content if present."""
    match = re.search(r"<title[^>]*>(.*?)</title>", text, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip().lower() if match else ""


async def check_access_control(client: httpx.AsyncClient, base_url: str) -> list[Finding]:
    findings = []
    base = base_url.rstrip("/")

    # 1. Probe for SPA catch-all or soft-404 behavior using two distinct random probe tokens
    probe_id1 = uuid.uuid4().hex[:12]
    probe_id2 = uuid.uuid4().hex[:12]
    is_catch_all = False
    fallback_lengths = []
    fallback_titles = set()

    for probe_path in (f"_securex_probe_{probe_id1}", f"_securex_probe_{probe_id2}.zip"):
        try:
            probe_resp = await safe_get(client, f"{base}/{probe_path}", timeout=5)
            if probe_resp.status_code == 200:
                ct = probe_resp.headers.get("content-type", "").lower()
                text_prev = probe_resp.text[:3000].lower()
                if is_html_response(ct, text_prev) or is_generic_error_or_not_found(text_prev):
                    is_catch_all = True
                    fallback_lengths.append(len(probe_resp.content))
                    t = extract_title(probe_resp.text[:3000])
                    if t:
                        fallback_titles.add(t)
        except (httpx.HTTPError, ScopeError):
            pass

    # 2. Inspect each diagnostic path
    for path in DIAGNOSTIC_PATHS:
        url = f"{base}/{path}"
        try:
            response = await safe_get(client, url, timeout=5)
        except (httpx.HTTPError, ScopeError):
            continue

        if response.status_code != 200 or not response.content:
            continue

        # If a redirect occurred and led to a different path (e.g. home or login), it is not the file
        if response.url.path.rstrip("/") != f"/{path}".rstrip("/"):
            # Redirected away from the target path
            continue

        content_type = response.headers.get("content-type", "").lower()
        content = response.content
        text_preview = response.text[:4000].strip()
        lower_text = text_preview.lower()
        resp_title = extract_title(text_preview)

        is_html = is_html_response(content_type, text_preview)
        is_error = is_generic_error_or_not_found(text_preview)

        # Check if response matches known catch-all fallback characteristics
        matches_fallback = False
        if is_catch_all:
            if resp_title and resp_title in fallback_titles:
                matches_fallback = True
            elif any(abs(len(content) - flen) < 250 for flen in fallback_lengths) and is_html:
                matches_fallback = True

        # Path-specific evaluations
        if path == "backup.zip":
            # Real zip signatures: PK\x03\x04 (standard), PK\x05\x06 (empty), PK\x07\x08 (spanned), or gzip
            is_real_zip = (
                content.startswith(b"PK\x03\x04")
                or content.startswith(b"PK\x05\x06")
                or content.startswith(b"PK\x07\x08")
                or content.startswith(b"\x1f\x8b")
            ) and not is_html

            if is_real_zip:
                findings.append(Finding(
                    id="ACCESS-confirmed-backup-zip",
                    category="ACCESS",
                    title="Exposed archive detected: /backup.zip",
                    severity="HIGH",
                    risk="A publicly downloadable archive was verified at /backup.zip with valid archive header signatures. This may contain source code, database dumps, or configuration files.",
                    fix="Remove the archive from the public web root immediately and store backups in an access-controlled, non-public storage system.",
                    evidence=f"GET /backup.zip returned HTTP 200 ({len(content)} bytes, header magic bytes verified, Content-Type: {content_type}).",
                    confidence="confirmed",
                    status="Needs fix",
                ))
            elif is_html or matches_fallback or is_error:
                # Generic fallback, custom 404, or SPA catch-all returning HTML: NOT a backup archive
                continue
            else:
                # Non-HTML response without confirmed zip magic bytes
                findings.append(Finding(
                    id="ACCESS-public-backup-zip",
                    category="ACCESS",
                    title="Potential backup path reachable: /backup.zip (unverified)",
                    severity="LOW",
                    risk="GET /backup.zip returned HTTP 200 with non-HTML content, but verified PKZIP magic bytes were not detected. Manual verification is required to determine whether internal data is served.",
                    fix="Verify whether /backup.zip exposes internal files. Restrict access or return HTTP 404.",
                    evidence=f"GET /backup.zip returned HTTP 200 ({len(content)} bytes, Content-Type: {content_type}). Archive magic bytes not confirmed.",
                    confidence="heuristic",
                    status="Review",
                ))

        elif path == "backup.sql":
            # Real SQL dump signatures
            sql_signatures = ("create table", "insert into", "-- mysql dump", "/*m!", "-- postgresql database dump", "drop table if exists")
            is_real_sql = any(sig in lower_text for sig in sql_signatures) and not is_html and not is_error

            if is_real_sql:
                findings.append(Finding(
                    id="ACCESS-confirmed-backup-sql",
                    category="ACCESS",
                    title="Exposed database dump detected: /backup.sql",
                    severity="CRITICAL",
                    risk="A publicly accessible SQL database dump was verified at /backup.sql containing schema and data manipulation statements.",
                    fix="Delete or restrict /backup.sql immediately and revoke any database credentials found within.",
                    evidence=f"GET /backup.sql returned HTTP 200 with verified SQL statements ({len(content)} bytes, Content-Type: {content_type}).",
                    confidence="confirmed",
                    status="Needs fix",
                ))
            elif is_html or matches_fallback or is_error:
                # Generic HTML fallback or soft-404: NOT a SQL dump
                continue
            else:
                findings.append(Finding(
                    id="ACCESS-public-backup-sql",
                    category="ACCESS",
                    title="Potential database dump path reachable: /backup.sql (unverified)",
                    severity="LOW",
                    risk="GET /backup.sql returned HTTP 200 with non-HTML content, but verified SQL schema statements were not identified. Manual verification is required.",
                    fix="Verify whether /backup.sql is an exposed database file. Deny public access or return HTTP 404.",
                    evidence=f"GET /backup.sql returned HTTP 200 ({len(content)} bytes, Content-Type: {content_type}). SQL DDL/DML signatures not confirmed.",
                    confidence="heuristic",
                    status="Review",
                ))

        elif path == "server-status":
            is_real_server_status = (
                "apache server status for" in lower_text
                or ("server version:" in lower_text and "total accesses:" in lower_text)
            ) and not matches_fallback

            if is_real_server_status:
                findings.append(Finding(
                    id="ACCESS-confirmed-server-status",
                    category="ACCESS",
                    title="Apache server-status page is publicly accessible",
                    severity="MEDIUM",
                    risk="The Apache server-status diagnostic dashboard is publicly accessible, revealing active requests, worker states, and internal URLs.",
                    fix="Restrict /server-status access to trusted administrators or disable mod_status in Apache configuration.",
                    evidence="GET /server-status returned verified Apache Server Status diagnostic metrics.",
                    confidence="confirmed",
                    status="Needs fix",
                ))
            elif matches_fallback or is_error or ("<html" in lower_text and not is_real_server_status):
                # Generic web page or catch-all route, not an Apache diagnostic page
                continue
            else:
                findings.append(Finding(
                    id="ACCESS-public-server-status",
                    category="ACCESS",
                    title="Potential server-status path responded HTTP 200 (unverified)",
                    severity="LOW",
                    risk="GET /server-status returned HTTP 200, but did not match verified Apache server-status metrics. Manual review is required.",
                    fix="Confirm that /server-status does not expose internal telemetry or server worker metrics.",
                    evidence=f"GET /server-status returned HTTP 200 ({len(content)} bytes, Content-Type: {content_type}). Diagnostic metrics not confirmed.",
                    confidence="heuristic",
                    status="Review",
                ))

        elif path == "debug":
            debug_indicators = (
                "django debug",
                "werkzeug debugger",
                "symfony profiler",
                "whoops! there was an error",
                "laravel ignition",
                "flask-debugtoolbar",
                "traceback (most recent call last)",
            )
            is_real_debug = any(ind in lower_text for ind in debug_indicators) and not matches_fallback

            if is_real_debug:
                findings.append(Finding(
                    id="ACCESS-confirmed-debug-console",
                    category="ACCESS",
                    title="Interactive debug interface publicly exposed: /debug",
                    severity="HIGH",
                    risk="A live debug console or profiler was confirmed at /debug, allowing unauthenticated visitors to inspect application state or execute interactive diagnostics.",
                    fix="Disable debug mode in production settings and restrict or remove the /debug endpoint.",
                    evidence=f"GET /debug returned active debug framework signatures (Content-Type: {content_type}).",
                    confidence="confirmed",
                    status="Needs fix",
                ))
            elif matches_fallback or is_error or ("<html" in lower_text and not is_real_debug):
                # Generic fallback or standard web page named debug, not an active debug interface
                continue
            else:
                findings.append(Finding(
                    id="ACCESS-public-debug",
                    category="ACCESS",
                    title="Potential debug endpoint responded HTTP 200 (unverified)",
                    severity="LOW",
                    risk="GET /debug returned HTTP 200, but did not match verified interactive debugger signatures. Manual review is required.",
                    fix="Verify whether /debug serves internal diagnostic tools or testing utilities.",
                    evidence=f"GET /debug returned HTTP 200 ({len(content)} bytes, Content-Type: {content_type}). Framework debug signatures not confirmed.",
                    confidence="heuristic",
                    status="Review",
                ))

    return findings

