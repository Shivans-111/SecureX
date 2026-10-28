"""Passive HTML form review for CSRF and insecure form submission indicators."""
import re
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from scanner.models import Finding

class FormParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.forms = []
        self.current = None
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag.lower() == "form":
            self.current = {"method": attrs.get("method", "get").lower(), "action": attrs.get("action", ""), "inputs": []}
            self.forms.append(self.current)
        elif tag.lower() == "input" and self.current is not None:
            self.current["inputs"].append({"name": (attrs.get("name") or "").lower(), "type": (attrs.get("type") or "text").lower()})
    def handle_endtag(self, tag):
        if tag.lower() == "form": self.current = None

def check_forms(html: str, page_url: str) -> list[Finding]:
    parser = FormParser()
    try: parser.feed(html)
    except Exception: return []
    findings = []
    for i, form in enumerate(parser.forms, start=1):
        names = [item["name"] for item in form["inputs"]]
        has_password = any(item["type"] == "password" for item in form["inputs"])
        has_token = any(any(token in name for token in ("csrf", "xsrf", "authenticity", "_token")) for name in names)
        action = urljoin(page_url, form["action"] or page_url)
        if urlparse(page_url).scheme == "https" and urlparse(action).scheme == "http" and (has_password or form["method"] == "post"):
            findings.append(Finding(
                id=f"AUTH-insecure-form-{i}", category="AUTH",
                title="Form submits data over HTTP", severity="HIGH",
                risk="Form data sent over plain HTTP may be intercepted or modified.",
                fix="Submit forms only over HTTPS and redirect HTTP requests to HTTPS.",
                evidence=f"Form {i} action resolves to {action}", confidence="heuristic", status="Review"))
        if form["method"] == "post" and not has_token:
            findings.append(Finding(
                id=f"INTEGRITY-csrf-form-{i}", category="INTEGRITY",
                title="POST form has no obvious CSRF token", severity="LOW",
                risk="A missing visible anti-CSRF token may indicate CSRF protection is absent; protection may also be implemented elsewhere (e.g. SameSite cookies or custom headers).",
                fix="Use framework CSRF protection for state-changing requests and validate tokens server-side; verify the design manually.",
                evidence=f"POST form {i} has no input name matching common CSRF token names.", confidence="heuristic", status="Review"))
    return findings
