# SecureX — Scanner Backend

Website vulnerability scanner backend for the SecureX hackathon project. The checks are passive and heuristic; they do not confirm exploitability.
Matches the flow from the pitch deck: **Submit URL → Check scope → Run checks → Analyze → Report** (notify-owner and re-test are manual follow-up steps, not automated here).

## What it checks (all passive — no exploitation, no destructive payloads)

| Category | Checks |
|---|---|
| HEADERS | Missing CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy; cookie Secure/HttpOnly/SameSite flags |
| CRYPTO | TLS protocol version, certificate validity/expiry, HTTP-only sites |
| CONFIG | Version-leaking headers (Server, X-Powered-By), directory listing, mixed content, exposed `.env`/`.git` paths |
| COMPONENTS | Outdated jQuery/Bootstrap/AngularJS/lodash detected via script tags |
| LOGGING | Stack traces / verbose errors leaked in the response |
| AUTH / ACCESS | Login forms submitted over plain HTTP; small set of likely-sensitive paths checked for public reachability |
| INJECTION | Passive database error signature detection (does not submit SQL payloads) |
| XSS | Static HTML/JavaScript sink indicators and inline scripts without CSP (heuristic only) |
| INTEGRITY / CSRF | POST forms without an obvious CSRF token (heuristic only) |
| CRAWLING | Bounded same-origin HTML crawl (up to 8 pages); checks forms and passive indicators on discovered pages |
| HISTORY | SQLite-backed scan history, recent summaries, and full report retrieval |

Every finding includes: category, severity (CRITICAL/HIGH/MEDIUM/LOW), a plain-language **risk** explanation, a **fix**, and evidence. Heuristic findings (library-version sniffing, exposed-path guesses) are flagged `"confidence": "heuristic"` so the UI can mark them "unverified — confirm manually," matching the deck's "unverified findings should not be presented as confirmed critical" principle.

## Run it

```bash
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Open `http://localhost:8000` for a built-in demo UI, or call the API directly:

```bash
curl -X POST http://localhost:8000/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "example.com"}'
```

## Integrating with your teammates' frontend

Point their UI at `POST /scan` with `{ "url": "..." }`. The response shape:

```json
{
  "target": "https://example.com",
  "scan_complete": true,
  "summary": { "total_findings": 7, "high_priority": 2, "by_severity": {...} },
  "findings": [
    {
      "category": "HEADERS",
      "category_label": "Security headers & cookie settings",
      "title": "Missing security header: content-security-policy",
      "severity": "MEDIUM",
      "risk": "...",
      "fix": "...",
      "evidence": "...",
      "status": "Needs fix",
      "confidence": "confirmed"
    }
  ],
  "errors": []
}
```

If `scan_complete` is `false`, check `errors` — this is the **safety gate**: the scanner refuses to scan `localhost`, private IP ranges (10.x, 192.168.x, 172.16-31.x), and link-local/cloud-metadata addresses (169.254.x), to prevent SSRF against internal infrastructure during the demo.

## Project layout

```
app.py                  FastAPI app, /scan and /health routes
scanner/
  safety.py             URL validation + SSRF guard (scope gate)
  models.py              Finding / ScanReport dataclasses, severity ordering
  engine.py              Orchestrates one fetch + all checks
  history.py              SQLite scan history
  checks/
    crawler.py             Bounded same-origin HTML crawler
    access_control.py      Common public backup/diagnostic path checks
    injection.py            Passive database error signature checks
    xss.py                  Static XSS-risk indicators
    forms.py                CSRF/form transport heuristics
    headers.py            Security headers
    cookies.py            Cookie flags
    tls.py                 TLS/cert checks
    components.py       Outdated JS library detection
    info_leak.py          Stack traces + exposed sensitive paths
    design.py              Directory listing, mixed content, HTTP login forms
static/index.html      Standalone demo UI (dark theme, matches deck styling)
```

## Extending it for the demo

- To add a new header or library signature, it's a one-line addition to the dict in `checks/headers.py` or `checks/components.py`.
- To wire into your dashboard's mock data shape (18 findings / 3 high priority / 7 fixes tracked from slide 6), just aggregate `summary` + persist `status` changes in whatever DB your teammates used for the UI — this backend is stateless per scan by design (hackathon-simple; add a DB layer if you want scan history).
- Swap the `.get()` check in `info_leak.py`'s sensitive path list for more paths if you want a bigger "wow" during the demo — kept short here to stay fast and safe.

## Safety note

This scanner performs GET-only, non-destructive checks. It does not submit forms, inject SQL/XSS payloads, bypass authentication, or confirm SQL injection/XSS exploitability. CSRF, access-control, and XSS results are indicators requiring manual verification. Only scan websites you own or have explicit authorization to test. Before public deployment, restrict CORS, add authentication/rate limits, and review DNS/redirect protections. The SQLite database stores scan targets and reports locally; protect it appropriately.
