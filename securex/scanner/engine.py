"""
Steps 03-05 of the SecureX flow: Run checks -> Analyze -> Report.
Fetches the target once, then runs every passive check module against
that single response (keeps it fast and avoids hammering the target).
"""
from urllib.parse import urlparse

import httpx

from scanner.models import ScanReport, now_iso
from scanner.safety import ScopeError, validate_target
from scanner.checks.headers import check_headers
from scanner.checks.cookies import check_cookies
from scanner.checks.tls import check_tls
from scanner.checks.info_leak import check_info_leak
from scanner.checks.components import check_components
from scanner.checks.design import check_design
from scanner.checks.injection import check_injection_indicators
from scanner.checks.xss import check_xss_indicators
from scanner.checks.forms import check_forms
from scanner.checks.access_control import check_access_control
from scanner.checks.crawler import same_origin_pages

USER_AGENT = "SecureX-Scanner/1.0 (+hackathon-demo; passive-checks-only)"


async def run_scan(raw_url: str) -> ScanReport:
    started = now_iso()

    # Step 01-02: submit + scope check (safety gate).
    try:
        target = validate_target(raw_url)
    except ScopeError as e:
        report = ScanReport(target=raw_url, started_at=started, finished_at=now_iso())
        report.errors.append(f"Safety gate stopped the scan: {e}")
        report.record_check("CHECK-SAFETY-SCOPE", "ACCESS", "Target Scope & SSRF Boundary", "could_not_run", str(e))
        return report

    report = ScanReport(target=target, started_at=started)
    report.record_check("CHECK-SAFETY-SCOPE", "ACCESS", "Target Scope & SSRF Boundary", "passed", "Target origin passed private IP and SSRF boundary validation.")
    parsed = urlparse(target)
    is_https = parsed.scheme == "https"

    async with httpx.AsyncClient(
        headers={"User-Agent": USER_AGENT},
        follow_redirects=False,
        timeout=10,
    ) as client:
        try:
            resp = await client.get(target)
        except httpx.HTTPError as e:
            report.errors.append(f"Could not reach target: {e}")
            report.record_check("CHECK-CONNECTIVITY", "CONFIG", "Target Web Connectivity", "could_not_run", f"Target unreachable: {e}")
            report.finished_at = now_iso()
            return report

        # Do not automatically follow redirects: validate the destination first to
        # reduce the risk of a redirect reaching private/internal infrastructure.
        if resp.is_redirect:
            location = resp.headers.get("location")
            if location:
                from urllib.parse import urljoin
                redirect_url = urljoin(target, location)
                try:
                    validated_redirect = validate_target(redirect_url)
                    resp = await client.get(validated_redirect, follow_redirects=False)
                except (ScopeError, httpx.HTTPError) as e:
                    report.errors.append(f"Redirect was not followed because it failed the safety check: {e}")
                    report.record_check("CHECK-REDIRECT", "ACCESS", "Redirect Safety Gate", "could_not_run", str(e))
                    report.finished_at = now_iso()
                    return report

        final_url = str(resp.url)
        final_is_https = final_url.startswith("https://")
        html = resp.text[:500_000]
        headers = dict(resp.headers)
        set_cookie_headers = resp.headers.get_list("set-cookie") if hasattr(resp.headers, "get_list") else (
            [headers["set-cookie"]] if "set-cookie" in headers else []
        )

        # Step 03: run checks (each module is independent and purely passive).
        
        # 1. Headers Check
        header_findings = check_headers(headers)
        for finding in header_findings:
            report.add(finding)
        if header_findings:
            report.record_check("CHECK-HEADERS", "HEADERS", "Security Headers & Leak Prevention", "finding", f"{len(header_findings)} header directives missing or technology versions disclosed.")
        else:
            report.record_check("CHECK-HEADERS", "HEADERS", "Security Headers & Leak Prevention", "passed", "Recommended security headers verified and server headers suppressed.")

        # 2. Cookies Check
        cookie_findings = check_cookies(set_cookie_headers, final_is_https)
        for finding in cookie_findings:
            report.add(finding)
        if cookie_findings:
            report.record_check("CHECK-COOKIES", "HEADERS", "Cookie Security Attributes", "finding", f"{len(cookie_findings)} cookies missing Secure, HttpOnly, or SameSite attributes.")
        else:
            report.record_check("CHECK-COOKIES", "HEADERS", "Cookie Security Attributes", "passed", "Cookies properly enforce Secure, HttpOnly, and SameSite attributes (or no cookies set).")

        # 3. Third-party components
        comp_findings = check_components(html)
        for finding in comp_findings:
            report.add(finding)
        if comp_findings:
            report.record_check("CHECK-COMPONENTS", "COMPONENTS", "Third-Party Component Libraries", "inconclusive", f"{len(comp_findings)} library version indicators observed in HTML (unverified).")
        else:
            report.record_check("CHECK-COMPONENTS", "COMPONENTS", "Third-Party Component Libraries", "passed", "No outdated client-side libraries detected via passive signatures.")

        # 4. Design & Architecture
        design_findings = check_design(html, final_url, final_is_https)
        for finding in design_findings:
            report.add(finding)
        if design_findings:
            report.record_check("CHECK-DESIGN", "DESIGN", "Site Transport & Architecture", "finding", f"{len(design_findings)} architecture or transport issues detected.")
        else:
            report.record_check("CHECK-DESIGN", "DESIGN", "Site Transport & Architecture", "passed", "HTTPS enforced, no directory listings or plain-HTTP credential inputs detected.")

        # 5. Injection Indicators
        inj_findings = check_injection_indicators(html)
        for finding in inj_findings:
            report.add(finding)
        if inj_findings:
            report.record_check("CHECK-INJECTION", "INJECTION", "Database Error Signatures", "inconclusive", "Database error or SQL signature detected in response HTML.")
        else:
            report.record_check("CHECK-INJECTION", "INJECTION", "Database Error Signatures", "passed", "No database error messages or SQL syntax leaks observed in response.")

        # 6. XSS Indicators
        xss_findings = check_xss_indicators(html, headers)
        for finding in xss_findings:
            report.add(finding)
        if xss_findings:
            report.record_check("CHECK-XSS", "XSS", "DOM Injection Sinks & Inline Scripts", "inconclusive", f"{len(xss_findings)} potential DOM sinks or inline scripts without CSP detected.")
        else:
            report.record_check("CHECK-XSS", "XSS", "DOM Injection Sinks & Inline Scripts", "passed", "No dangerous DOM sinks or unprotected inline scripts observed.")

        # 7. Form Security
        form_findings = check_forms(html, final_url)
        for finding in form_findings:
            report.add(finding)
        if form_findings:
            report.record_check("CHECK-FORMS", "AUTH", "Form Security & Anti-CSRF", "inconclusive", f"{len(form_findings)} forms have potential HTTP targets or lack visible CSRF tokens.")
        else:
            report.record_check("CHECK-FORMS", "AUTH", "Form Security & Anti-CSRF", "passed", "Forms submit over HTTPS and include anti-CSRF token parameters.")

        # 8. Diagnostic Endpoints & Backups
        base_url = f"{urlparse(final_url).scheme}://{urlparse(final_url).netloc}"
        access_findings = await check_access_control(client, base_url)
        for finding in access_findings:
            report.add(finding)
        has_confirmed_access = any(f.confidence == "confirmed" for f in access_findings)
        if has_confirmed_access:
            report.record_check("CHECK-ACCESS", "ACCESS", "Diagnostic Endpoints & Backups", "finding", f"Exposed backup archive or diagnostic console confirmed ({len(access_findings)} findings).")
        elif access_findings:
            report.record_check("CHECK-ACCESS", "ACCESS", "Diagnostic Endpoints & Backups", "inconclusive", f"{len(access_findings)} path(s) returned HTTP 200 without confirmed signatures (potential).")
        else:
            report.record_check("CHECK-ACCESS", "ACCESS", "Diagnostic Endpoints & Backups", "passed", "Common backup archives and diagnostic endpoints (/backup.zip, /backup.sql, /debug, /server-status) are restricted.")

        # 9. Configuration & Info Leaks
        leak_findings = await check_info_leak(client, base_url, html)
        for finding in leak_findings:
            report.add(finding)
        has_confirmed_leak = any(f.confidence == "confirmed" for f in leak_findings)
        if has_confirmed_leak:
            report.record_check("CHECK-INFO-LEAK", "CONFIG", "Sensitive File & Stack Trace Leaks", "finding", f"Publicly readable configuration file (.env/.git) or stack trace confirmed.")
        elif leak_findings:
            report.record_check("CHECK-INFO-LEAK", "CONFIG", "Sensitive File & Stack Trace Leaks", "inconclusive", f"{len(leak_findings)} potential configuration path(s) reachable without confirmed signatures.")
        else:
            report.record_check("CHECK-INFO-LEAK", "CONFIG", "Sensitive File & Stack Trace Leaks", "passed", "Sensitive configuration files (/.env, /.git/config, /wp-config.php.bak) are restricted and no error traces observed.")

        # 10. Crawl same-origin pages
        crawled_count = 0
        async for page_url, page_html, page_headers in same_origin_pages(final_url, html, client):
            if page_url == final_url:
                continue
            crawled_count += 1
            for finding in check_forms(page_html, page_url):
                report.add(finding)
            for finding in check_xss_indicators(page_html, page_headers):
                report.add(finding)
            for finding in check_injection_indicators(page_html):
                report.add(finding)

        report.record_check("CHECK-CRAWLER", "DESIGN", "Reachable Subpage Verification", "passed", f"Crawled and analyzed {crawled_count} reachable same-origin subpage(s).")

    # 11. TLS / SSL Certificate Check
    target_port = parsed.port or (443 if is_https else 443)
    tls_findings = check_tls(parsed.hostname, port=target_port)
    is_tls_unreachable = any(f.id == "CRYPTO-tls-unreachable" for f in tls_findings)
    for finding in tls_findings:
        report.add(finding)
    if is_tls_unreachable:
        report.record_check("CHECK-TLS", "CRYPTO", "TLS Protocol & Certificate Validity", "could_not_run", f"Could not establish TLS connection on port {target_port}.")
    elif tls_findings:
        report.record_check("CHECK-TLS", "CRYPTO", "TLS Protocol & Certificate Validity", "finding", f"{len(tls_findings)} TLS configuration or certificate expiration issues detected.")
    else:
        report.record_check("CHECK-TLS", "CRYPTO", "TLS Protocol & Certificate Validity", "passed", "Negotiated modern TLS protocol and SSL certificate is valid and unexpired.")

    # Step 04-05: Complete scan report
    report.scan_complete = True
    report.finished_at = now_iso()
    return report
