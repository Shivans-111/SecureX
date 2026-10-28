"""
Comprehensive test suite for Secure X scoring model and scanner improvements.
Tests:
1. No findings
2. Low-severity findings
3. High-severity and Critical findings
4. Duplicate findings (crawler subpage deduplication)
5. Heuristic-only findings (0.4x weighting factor)
6. Failed and incomplete scans (safety gate stops)
7. Access control soft-404 handling (eliminating fake 200 HTML backup.zip/sql/debug false positives)
8. Consistency between backend scoring and report structure
"""
import unittest
from scanner.models import Finding, ScanReport
from scanner.scoring import calculate_scan_score, SEVERITY_WEIGHTS, HEURISTIC_WEIGHT_FACTOR


class TestSecureXScoring(unittest.TestCase):

    def test_no_findings(self):
        """Scans with zero findings should yield 100% Safety, 0% Risk."""
        score = calculate_scan_score([], scan_complete=True)
        self.assertEqual(score["safety_score"], 100)
        self.assertEqual(score["risk_score"], 0)
        self.assertEqual(score["status"], "available")
        self.assertEqual(score["deduplicated_findings_count"], 0)
        self.assertEqual(score["raw_risk_score"], 0.0)

    def test_low_severity_findings(self):
        """Scans with only low-severity findings (2 pts each)."""
        findings = [
            Finding(id="F1", category="HEADERS", title="Missing X-Frame-Options", severity="LOW", risk="r", fix="f"),
            Finding(id="F2", category="HEADERS", title="Missing Referrer-Policy", severity="LOW", risk="r", fix="f"),
            Finding(id="F3", category="HEADERS", title="Missing Permissions-Policy", severity="LOW", risk="r", fix="f"),
        ]
        score = calculate_scan_score(findings, scan_complete=True)
        # 3 * 2.0 = 6.0 raw risk -> 6% risk, 94% safety
        self.assertEqual(score["raw_risk_score"], 6.0)
        self.assertEqual(score["risk_score"], 6)
        self.assertEqual(score["safety_score"], 94)
        self.assertIn("Low Risk", score["rating"])

    def test_high_and_critical_findings(self):
        """Scans with high and critical findings (Critical=25, High=15, Medium=6)."""
        findings = [
            Finding(id="C1", category="ACCESS", title="Confirmed DB dump", severity="CRITICAL", risk="r", fix="f"),
            Finding(id="H1", category="CRYPTO", title="Weak TLS 1.0 protocol", severity="HIGH", risk="r", fix="f"),
            Finding(id="M1", category="HEADERS", title="Missing CSP", severity="MEDIUM", risk="r", fix="f"),
        ]
        score = calculate_scan_score(findings, scan_complete=True)
        # 25 + 15 + 6 = 46.0 raw risk -> 46% risk, 54% safety
        self.assertEqual(score["raw_risk_score"], 46.0)
        self.assertEqual(score["risk_score"], 46)
        self.assertEqual(score["safety_score"], 54)
        self.assertEqual(score["rating"], "Elevated Risk Posture")

    def test_duplicate_findings_deduplication(self):
        """Duplicate findings from subpage crawling must be deduplicated."""
        findings = [
            Finding(id="DUP-CSP", category="HEADERS", title="Missing CSP", severity="MEDIUM", risk="r", fix="f"),
            Finding(id="DUP-CSP", category="HEADERS", title="Missing CSP", severity="MEDIUM", risk="r", fix="f"),
            Finding(id="DUP-CSP", category="HEADERS", title="Missing CSP", severity="MEDIUM", risk="r", fix="f"),
        ]
        score = calculate_scan_score(findings, scan_complete=True)
        # Only 1 unique finding should be counted -> 6.0 raw risk, not 18.0
        self.assertEqual(score["deduplicated_findings_count"], 1)
        self.assertEqual(score["raw_risk_score"], 6.0)
        self.assertEqual(score["risk_score"], 6)
        self.assertEqual(score["safety_score"], 94)

    def test_heuristic_only_findings(self):
        """Heuristic findings must receive a 0.4x factor and be recorded properly."""
        findings = [
            Finding(id="H-LIB", category="COMPONENTS", title="Outdated jQuery", severity="MEDIUM", risk="r", fix="f", confidence="heuristic"),
            Finding(id="H-XSS", category="XSS", title="Potential DOM sink", severity="LOW", risk="r", fix="f", confidence="heuristic"),
        ]
        score = calculate_scan_score(findings, scan_complete=True)
        # Medium 6.0 * 0.4 = 2.4, Low 2.0 * 0.4 = 0.8 -> Total = 3.2 -> Risk: 3%, Safety: 97%
        self.assertEqual(score["heuristic_count"], 2)
        self.assertEqual(score["confirmed_count"], 0)
        self.assertEqual(score["raw_risk_score"], 3.2)
        self.assertEqual(score["risk_score"], 3)
        self.assertEqual(score["safety_score"], 97)

    def test_failed_or_incomplete_scans(self):
        """Failed or incomplete scans should return status='unavailable'."""
        score_incomplete = calculate_scan_score([], scan_complete=False)
        self.assertEqual(score_incomplete["status"], "unavailable")
        self.assertIsNone(score_incomplete["safety_score"])
        self.assertIsNone(score_incomplete["risk_score"])
        self.assertEqual(score_incomplete["score_label"], "Score unavailable")

        score_error = calculate_scan_score([], scan_complete=False, errors=["Safety gate stopped: localhost is forbidden"])
        self.assertEqual(score_error["status"], "unavailable")
        self.assertIsNone(score_error["safety_score"])

    def test_kit_ac_in_simulated_real_report(self):
        """Simulate kit.ac.in realistic findings with outdated library as unverified and headers."""
        findings = [
            Finding(id="COMPONENTS-jquery", category="COMPONENTS", title="Outdated library indicator: jquery 3.4 (unverified)", severity="MEDIUM", risk="r", fix="f", confidence="heuristic"),
            Finding(id="HEADERS-strict-transport-security", category="HEADERS", title="Missing security header: strict-transport-security", severity="MEDIUM", risk="r", fix="f", confidence="confirmed"),
            Finding(id="HEADERS-x-frame-options", category="HEADERS", title="Missing security header: x-frame-options", severity="LOW", risk="r", fix="f", confidence="confirmed"),
            Finding(id="HEADERS-x-content-type-options", category="HEADERS", title="Missing security header: x-content-type-options", severity="LOW", risk="r", fix="f", confidence="confirmed"),
            Finding(id="HEADERS-referrer-policy", category="HEADERS", title="Missing security header: referrer-policy", severity="LOW", risk="r", fix="f", confidence="confirmed"),
            Finding(id="HEADERS-permissions-policy", category="HEADERS", title="Missing security header: permissions-policy", severity="LOW", risk="r", fix="f", confidence="confirmed"),
            Finding(id="CONFIG-leak-server", category="CONFIG", title="Server/technology version disclosed via server", severity="LOW", risk="r", fix="f", confidence="confirmed"),
            Finding(id="CONFIG-leak-x-powered-by", category="CONFIG", title="Server/technology version disclosed via x-powered-by", severity="LOW", risk="r", fix="f", confidence="confirmed"),
            Finding(id="HEADERS-cookie-ci_session-samesite", category="HEADERS", title="Cookie 'ci_session' missing SameSite attribute", severity="LOW", risk="r", fix="f", confidence="confirmed"),
        ]
        report = ScanReport(target="https://kit.ac.in", started_at="2026-10-28T10:00:00Z")
        for f in findings:
            report.add(f)
        report.scan_complete = True
        data = report.to_dict()

        self.assertIn("score", data)
        score = data["score"]
        self.assertEqual(score["status"], "available")
        self.assertIsInstance(score["safety_score"], int)
        self.assertIsInstance(score["risk_score"], int)
        self.assertEqual(score["safety_score"] + score["risk_score"], 100)
        self.assertEqual(score["deduplicated_findings_count"], 9)
        self.assertEqual(score["heuristic_count"], 1)
        self.assertEqual(score["confirmed_count"], 8)
        # 1 Medium heuristic: 6*0.4 = 2.4
        # 1 Medium confirmed: 6.0
        # 7 Low confirmed: 7*2.0 = 14.0
        # Total = 22.4 -> Risk = 22%, Safety = 78%
        self.assertEqual(score["raw_risk_score"], 22.4)
        self.assertEqual(score["risk_score"], 22)
        self.assertEqual(score["safety_score"], 78)

    def test_missing_header_case(self):
        """Websites missing security headers must report clear findings."""
        from scanner.checks.headers import check_headers
        empty_headers = {}
        findings = check_headers(empty_headers)
        # Should flag all 6 standard security headers
        flagged_titles = [f.title for f in findings]
        self.assertTrue(any("content-security-policy" in t.lower() for t in flagged_titles))
        self.assertTrue(any("strict-transport-security" in t.lower() for t in flagged_titles))
        self.assertTrue(any("x-frame-options" in t.lower() for t in flagged_titles))
        self.assertEqual(len(findings), 6)

    def test_present_header_case(self):
        """Websites with hardened security headers should produce 0 header findings."""
        from scanner.checks.headers import check_headers
        good_headers = {
            "content-security-policy": "default-src 'self'",
            "strict-transport-security": "max-age=31536000; includeSubDomains",
            "x-frame-options": "DENY",
            "x-content-type-options": "nosniff",
            "referrer-policy": "strict-origin-when-cross-origin",
            "permissions-policy": "camera=(), microphone=()",
        }
        findings = check_headers(good_headers)
        self.assertEqual(len(findings), 0)

    def test_generic_html_fallback_not_reported_as_exposure(self):
        """Generic HTML fallback / SPA catch-all returning 200 must NOT be classified as exposed backup archive."""
        import asyncio
        import httpx
        from scanner.checks.access_control import check_access_control

        spa_html = (
            "<!DOCTYPE html><html lang='en'><head><title>App Landing Page</title></head>"
            "<body><div id='root'></div><script src='/main.js'></script></body></html>"
        )

        def mock_handler(request: httpx.Request):
            # SPA returns 200 and generic HTML for all paths including probe, backup.zip, backup.sql
            return httpx.Response(200, headers={"Content-Type": "text/html; charset=utf-8"}, text=spa_html)

        async def run_test():
            transport = httpx.MockTransport(mock_handler)
            async with httpx.AsyncClient(transport=transport) as client:
                findings = await check_access_control(client, "https://test-spa-domain.example")
                # Must be empty: NO false positives on generic HTML fallback
                self.assertEqual(len(findings), 0)

        asyncio.run(run_test())

    def test_confirmed_backup_archive_detection(self):
        """A real ZIP file returning 200 with PK\\x03\\x04 must be verified as confirmed exposure."""
        import asyncio
        import httpx
        from scanner.checks.access_control import check_access_control

        real_zip_bytes = b"PK\x03\x04\x14\x00\x00\x00\x08\x00" + b"\x00" * 30

        def mock_handler(request: httpx.Request):
            if request.url.path == "/backup.zip":
                return httpx.Response(200, headers={"Content-Type": "application/zip"}, content=real_zip_bytes)
            return httpx.Response(404, text="Not Found")

        async def run_test():
            transport = httpx.MockTransport(mock_handler)
            async with httpx.AsyncClient(transport=transport) as client:
                findings = await check_access_control(client, "https://vulnerable-test.example")
                self.assertEqual(len(findings), 1)
                self.assertEqual(findings[0].id, "ACCESS-confirmed-backup-zip")
                self.assertEqual(findings[0].confidence, "confirmed")
                self.assertEqual(findings[0].severity, "HIGH")

        asyncio.run(run_test())

    def test_potential_unverified_diagnostic_path(self):
        """Non-HTML response lacking verified magic bytes must be labeled potential unverified."""
        import asyncio
        import httpx
        from scanner.checks.access_control import check_access_control

        def mock_handler(request: httpx.Request):
            if request.url.path == "/backup.zip":
                # Non-HTML, non-error, but unverified binary
                return httpx.Response(200, headers={"Content-Type": "application/octet-stream"}, content=b"UNKNOWN_BINARY_DATA_XYZ_12345")
            return httpx.Response(404, text="Not Found")

        async def run_test():
            transport = httpx.MockTransport(mock_handler)
            async with httpx.AsyncClient(transport=transport) as client:
                findings = await check_access_control(client, "https://ambiguous-test.example")
                self.assertEqual(len(findings), 1)
                self.assertEqual(findings[0].id, "ACCESS-public-backup-zip")
                self.assertEqual(findings[0].confidence, "heuristic")
                self.assertIn("unverified", findings[0].title.lower())
                self.assertEqual(findings[0].to_dict()["confidence_label"], "Potential — manual verification required")

        asyncio.run(run_test())

    def test_check_execution_tracking(self):
        """ScanReport must record checks summary distinguishing passed, findings, inconclusive, and could_not_run."""
        report = ScanReport(target="https://example.com", started_at="2026-10-28T10:00:00Z")
        report.record_check("CHECK-1", "HEADERS", "Headers", "passed", "All ok")
        report.record_check("CHECK-2", "HEADERS", "Cookies", "finding", "Missing flag")
        report.record_check("CHECK-3", "ACCESS", "Backups", "inconclusive", "Unverified path")
        report.record_check("CHECK-4", "CRYPTO", "TLS", "could_not_run", "Timeout on port 443")
        report.scan_complete = True

        chk_sum = report.checks_summary()
        self.assertEqual(chk_sum["total_performed"], 4)
        self.assertEqual(chk_sum["passed"], 1)
        self.assertEqual(chk_sum["findings"], 1)
        self.assertEqual(chk_sum["inconclusive"], 1)
        self.assertEqual(chk_sum["could_not_run"], 1)

    def test_safety_scope_blocks_private_and_localhost(self):
        """Scope safety gate must reject localhost, private IPv4/IPv6, and cloud metadata targets."""
        from scanner.safety import validate_target, ScopeError

        blocked_targets = [
            "http://localhost:8000",
            "http://127.0.0.1:5173",
            "http://169.254.169.254/latest/meta-data/",
            "http://10.0.0.1",
            "http://192.168.1.1",
            "http://172.16.0.1",
            "http://[::1]:8080",
            "ftp://example.com",
            "",
        ]
        for target in blocked_targets:
            with self.subTest(target=target):
                with self.assertRaises(ScopeError):
                    validate_target(target)

    def test_score_mathematical_consistency_and_limitation(self):
        """Safety + Risk must strictly equal 100%, remain bounded [0, 100], and include the required limitation."""
        from scanner.scoring import LIMITATION_STATEMENT
        self.assertEqual(
            LIMITATION_STATEMENT,
            "Scores are estimates based on the checks performed. They do not guarantee that a website is secure or establish the probability that it will be hacked."
        )

        # Extreme high finding load to test capping
        many_findings = [
            Finding(id=f"CRIT-{i}", category="ACCESS", title=f"Critical Issue {i}", severity="CRITICAL", risk="r", fix="f")
            for i in range(10)  # 10 * 25 = 250 raw risk points
        ]
        score = calculate_scan_score(many_findings, scan_complete=True)
        self.assertEqual(score["risk_score"], 100)
        self.assertEqual(score["safety_score"], 0)
        self.assertEqual(score["safety_score"] + score["risk_score"], 100)
        self.assertIn(LIMITATION_STATEMENT, score["limitation_statement"])
        self.assertIn(LIMITATION_STATEMENT, score["explanation"])

    def test_info_leak_spa_fallback_suppression(self):
        """Generic HTML responses for .env or .git/config must not be flagged as exposed files."""
        import asyncio
        import httpx
        from scanner.checks.info_leak import check_info_leak

        spa_html = "<!doctype html><html><head><title>SPA</title></head><body><div id='root'></div></body></html>"

        def mock_handler(request: httpx.Request):
            return httpx.Response(200, headers={"Content-Type": "text/html; charset=utf-8"}, text=spa_html)

        async def run_test():
            transport = httpx.MockTransport(mock_handler)
            async with httpx.AsyncClient(transport=transport) as client:
                findings = await check_info_leak(client, "https://test-spa-fallback.example", spa_html)
                # Sensitive paths must be suppressed due to HTML fallback
                exposed_paths = [f.id for f in findings if "exposed" in f.id]
                self.assertEqual(len(exposed_paths), 0)

        asyncio.run(run_test())

    def test_confirmed_env_file_detection(self):
        """Plaintext .env file with valid environment variables must be detected as confirmed critical finding."""
        import asyncio
        import httpx
        from scanner.checks.info_leak import check_info_leak

        env_body = "APP_NAME=SecureX\nAPP_KEY=base64:abcd1234efgh5678\nDB_PASSWORD=supersecret\n"

        def mock_handler(request: httpx.Request):
            if request.url.path == "/.env":
                return httpx.Response(200, headers={"Content-Type": "text/plain"}, text=env_body)
            return httpx.Response(404, text="Not Found")

        async def run_test():
            transport = httpx.MockTransport(mock_handler)
            async with httpx.AsyncClient(transport=transport) as client:
                findings = await check_info_leak(client, "https://vulnerable-env.example", "<html><body>OK</body></html>")
                self.assertEqual(len(findings), 1)
                self.assertEqual(findings[0].id, "CONFIG-exposed-env")
                self.assertEqual(findings[0].confidence, "confirmed")
                self.assertEqual(findings[0].severity, "CRITICAL")

        asyncio.run(run_test())

    def test_safe_get_blocks_ssrf_redirect(self):
        """safe_get must block redirects targeting private networks or localhost."""
        import asyncio
        import httpx
        from scanner.safety import safe_get, ScopeError

        def mock_handler(request: httpx.Request):
            if request.url.path == "/redirect-to-localhost":
                return httpx.Response(302, headers={"Location": "http://127.0.0.1:8080/secret"})
            return httpx.Response(200, text="OK")

        async def run_test():
            transport = httpx.MockTransport(mock_handler)
            async with httpx.AsyncClient(transport=transport) as client:
                with self.assertRaises(ScopeError):
                    await safe_get(client, "https://legit-domain.example/redirect-to-localhost")

        asyncio.run(run_test())


if __name__ == "__main__":
    unittest.main()

