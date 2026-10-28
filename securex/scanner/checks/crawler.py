"""Small, bounded same-origin HTML crawler. GET-only, no forms submitted."""
from collections import deque
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse, urldefrag
import httpx

MAX_PAGES = 8

class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.links = []
    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            href = dict(attrs).get("href")
            if href: self.links.append(href)

async def same_origin_pages(home_url: str, home_html: str, client: httpx.AsyncClient):
    """Async generator yielding (url, html, headers); homepage is included."""
    origin = urlparse(home_url)
    queue = deque([(home_url, home_html, {})])
    visited = set()
    while queue and len(visited) < MAX_PAGES:
        url, html, headers = queue.popleft()
        normalized, _ = urldefrag(url)
        if normalized in visited: continue
        visited.add(normalized)
        yield normalized, html, headers
        parser = LinkParser()
        try: parser.feed(html)
        except Exception: continue
        for href in parser.links:
            candidate = urldefrag(urljoin(normalized, href))[0]
            parsed = urlparse(candidate)
            if parsed.scheme not in ("http", "https") or parsed.hostname != origin.hostname or parsed.port != origin.port:
                continue
            if parsed.path.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.zip', '.css', '.js')):
                continue
            if candidate not in visited and len(visited) + len(queue) < MAX_PAGES:
                try:
                    response = await client.get(candidate, timeout=5, follow_redirects=False)
                    if response.status_code == 200 and "text/html" in response.headers.get("content-type", "text/html"):
                        queue.append((candidate, response.text[:500_000], dict(response.headers)))
                except httpx.HTTPError:
                    pass
