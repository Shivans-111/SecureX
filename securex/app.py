"""
SecureX backend API.

Run:
    pip install -r requirements.txt
    uvicorn app:app --reload --port 8000

Endpoints:
    POST /scan            { "url": "example.com" }  -> full report JSON
    GET  /health           -> liveness check
    GET  /                       -> demo HTML page (test without the real frontend)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from scanner.engine import run_scan
from scanner.history import save_report, list_scans, get_scan

app = FastAPI(
    title="SecureX Scanner API",
    description="Find the weakness. Fix the risk. — passive website vulnerability scan.",
    version="1.0.0",
)

# Wide-open CORS for hackathon demo purposes; tighten this to your actual
# frontend origin before any real deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScanRequest(BaseModel):
    url: str = Field(..., description="Target website URL, e.g. https://example.com")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/scan")
async def scan(req: ScanRequest):
    report = (await run_scan(req.url)).to_dict()
    scan_id = save_report(report)
    report["scan_id"] = scan_id
    return report


@app.get("/scans")
async def scans(limit: int = 20):
    """Return recent scan summaries. Limit is capped to keep responses small."""
    return {"scans": list_scans(max(1, min(limit, 100)))}


@app.get("/scans/{scan_id}")
async def scan_detail(scan_id: int):
    """Return a previously saved full report."""
    report = get_scan(scan_id)
    if report is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Scan not found")
    return report


@app.get("/", response_class=HTMLResponse)
async def demo_page():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()


app.mount("/static", StaticFiles(directory="static"), name="static")
