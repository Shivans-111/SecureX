import { useState, useEffect, useRef, useCallback } from 'react'
import type { ScanReport, ScanHistoryItem } from '../../types/scanner'
import {
  checkBackendHealth,
  executeScan,
  fetchScanHistory,
  fetchScanById,
  getApiBaseUrl,
  saveApiBaseUrl,
} from '../../services/scannerApi'
import { soundEngine } from '../../utils/soundEngine'
import { generateScanReportPdf } from '../../utils/pdfGenerator'
import { calculateScanScoreClient } from '../../utils/scoreCalculator'
import './Scanner.css'

interface ScannerViewProps {
  onBackToOverview: () => void
}

const HONEST_LOADING_PHASES = [
  'Validating target scope and evaluating SSRF safety boundary...',
  'Dispatching non-destructive HTTP & TLS handshake probes...',
  'Evaluating passive security headers, cookie attributes & structural cues...',
  'Analyzing passive database error, XSS sink, & information leak indicators...',
  'Synthesizing risk priorities and structured remediation guidance...',
]

export function ScannerView({ onBackToOverview }: ScannerViewProps) {
  const [urlInput, setUrlInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingPhaseIndex, setLoadingPhaseIndex] = useState(0)
  const [report, setReport] = useState<ScanReport | null>(null)
  const [isArchivedView, setIsArchivedView] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Backend Health & Config
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(getApiBaseUrl())
  const [customUrlInput, setCustomUrlInput] = useState<string>(getApiBaseUrl())
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [apiHealth, setApiHealth] = useState<{ ok: boolean; url: string; error?: string }>({
    ok: false,
    url: getApiBaseUrl(),
  })

  // Scan History & Retrieval State
  const [historyList, setHistoryList] = useState<ScanHistoryItem[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [directScanIdInput, setDirectScanIdInput] = useState('')
  const [isScoreInfoOpen, setIsScoreInfoOpen] = useState(false)

  const phaseTimerRef = useRef<number | null>(null)

  // Load history from GET /scans
  const loadHistory = useCallback(async (baseUrl: string = apiBaseUrl) => {
    setIsHistoryLoading(true)
    setHistoryError(null)
    try {
      const scans = await fetchScanHistory(30, baseUrl)
      setHistoryList(scans)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setHistoryError(msg)
    } finally {
      setIsHistoryLoading(false)
    }
  }, [apiBaseUrl])

  // Check health and load history on mount and when base URL changes
  useEffect(() => {
    let isMounted = true

    const checkHealth = async () => {
      const result = await checkBackendHealth(apiBaseUrl)
      if (isMounted) {
        setApiHealth(result)
        if (result.ok) {
          loadHistory(apiBaseUrl)
        }
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 15000)

    // Check if URL has ?scanId= or ?id= query param
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const qId = params.get('scanId') || params.get('id')
      if (qId && !isNaN(Number(qId))) {
        const idNum = Number(qId)
        fetchScanById(idNum, apiBaseUrl)
          .then((rep) => {
            if (isMounted) {
              setReport(rep)
              setIsArchivedView(true)
              setUrlInput(rep.target)
            }
          })
          .catch(() => {
            // ignore initial query param fetch failure
          })
      }
    }

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [apiBaseUrl, loadHistory])

  // Honest rotating loading messages while scan is running
  useEffect(() => {
    if (isLoading) {
      setLoadingPhaseIndex(0)
      phaseTimerRef.current = window.setInterval(() => {
        setLoadingPhaseIndex((prev) => (prev + 1) % HONEST_LOADING_PHASES.length)
      }, 2200)
    } else {
      if (phaseTimerRef.current) {
        clearInterval(phaseTimerRef.current)
        phaseTimerRef.current = null
      }
    }
    return () => {
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current)
    }
  }, [isLoading])

  // Start a new live scan
  const handleStartScan = async (targetUrl?: string) => {
    const rawTarget = targetUrl || urlInput
    if (!rawTarget.trim()) return

    soundEngine.playFeedbackBeep()
    setIsLoading(true)
    setErrorMsg(null)
    setReport(null)
    setIsArchivedView(false)
    setIsHistoryOpen(false)

    try {
      const result = await executeScan(rawTarget, apiBaseUrl)
      setReport(result)
      soundEngine.playFeedbackBeep()
      // Refresh history list so newly saved scan immediately appears
      loadHistory(apiBaseUrl)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setErrorMsg(message)
    } finally {
      setIsLoading(false)
    }
  }

  // Load a previously saved scan by ID via GET /scans/{id}
  const handleSelectHistoryScan = async (scanId: number) => {
    soundEngine.playFeedbackBeep()
    setIsLoading(true)
    setErrorMsg(null)
    setReport(null)
    setIsArchivedView(true)

    try {
      const savedReport = await fetchScanById(scanId, apiBaseUrl)
      setReport(savedReport)
      setUrlInput(savedReport.target)
      setIsHistoryOpen(false)
      soundEngine.playFeedbackBeep()
      window.scrollTo({ top: 400, behavior: 'smooth' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
    }
  }

  // Direct ID retrieval form submission
  const handleDirectIdSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = parseInt(directScanIdInput.trim(), 10)
    if (!isNaN(id) && id > 0) {
      handleSelectHistoryScan(id)
    }
  }

  const handleQuickPreset = (preset: string) => {
    setUrlInput(preset)
    handleStartScan(preset)
  }

  const handleSaveApiUrl = () => {
    const trimmed = customUrlInput.trim().replace(/\/$/, '')
    if (trimmed) {
      saveApiBaseUrl(trimmed)
      setApiBaseUrl(trimmed)
      setIsConfigOpen(false)
      soundEngine.playFeedbackBeep()
    }
  }

  // Download PDF Report
  const handleDownloadPdf = () => {
    if (!report) return
    try {
      soundEngine.playFeedbackBeep()
      generateScanReportPdf(report)
    } catch (err: unknown) {
      console.error('Failed to generate PDF report:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`PDF Generation Error: ${msg}`)
    }
  }

  // Filter findings
  const filteredFindings = (report?.findings || []).filter((f) => {
    if (severityFilter !== 'ALL') {
      if (severityFilter === 'HIGH_PRIORITY') {
        if (f.severity !== 'CRITICAL' && f.severity !== 'HIGH') return false
      } else if (f.severity !== severityFilter) {
        return false
      }
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      const inTitle = f.title.toLowerCase().includes(q)
      const inCat = f.category_label.toLowerCase().includes(q)
      const inRisk = f.risk.toLowerCase().includes(q)
      const inFix = f.fix.toLowerCase().includes(q)
      return inTitle || inCat || inRisk || inFix
    }

    return true
  })

  // Deterministic Website Safety and Assessed Risk Scores
  const scanScore = report
    ? report.score ||
      calculateScanScoreClient(
        report.findings,
        report.scan_complete,
        report.errors,
        report.checks_summary?.total_performed,
        report.checks_summary?.could_not_run
      )
    : null

  const gaugeRadius = 28
  const gaugeCircumference = 2 * Math.PI * gaugeRadius
  const safetyOffset =
    scanScore && scanScore.safety_score !== null
      ? gaugeCircumference - (scanScore.safety_score / 100) * gaugeCircumference
      : gaugeCircumference
  const riskOffset =
    scanScore && scanScore.risk_score !== null
      ? gaugeCircumference - (scanScore.risk_score / 100) * gaugeCircumference
      : gaugeCircumference

  return (
    <div className="scanner-view-container" role="region" aria-label="Secure X Vulnerability Scanner">
      <div className="scanner-ambient-glow" aria-hidden="true" />

      {/* Top Navigation Bar */}
      <nav className="scanner-nav-bar">
        <div className="scanner-nav-brand" onClick={onBackToOverview}>
          <span className="brand-dot" />
          <span className="brand-name">
            SECURE <span className="brand-accent">X</span>
          </span>
        </div>

        <div className="scanner-nav-right">
          {/* Scan History Toggle Button */}
          <button
            type="button"
            className={`history-nav-btn ${isHistoryOpen ? 'is-active' : ''}`}
            onClick={() => {
              soundEngine.playFeedbackBeep()
              setIsHistoryOpen((prev) => !prev)
              if (!isHistoryOpen) loadHistory(apiBaseUrl)
            }}
            title="Browse saved scans in SQLite archive"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>SCAN HISTORY</span>
            {historyList.length > 0 && <span className="history-count-badge">{historyList.length}</span>}
          </button>

          {/* Backend Connectivity Status Indicator */}
          <div
            className={`api-status-badge ${apiHealth.ok ? 'is-online' : 'is-offline'}`}
            title={
              apiHealth.ok
                ? `Connected to ${apiHealth.url}`
                : `Backend unreachable at ${apiHealth.url}: ${apiHealth.error || 'Server not responding'}`
            }
          >
            <span className="status-dot" />
            <span>{apiHealth.ok ? 'API ONLINE' : 'BACKEND OFFLINE'}</span>
          </div>

          <button
            type="button"
            className="scanner-return-btn"
            onClick={onBackToOverview}
            aria-label="Return to Project Overview"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>OVERVIEW</span>
          </button>
        </div>
      </nav>

      <main className="scanner-main-content">
        {/* Page Header */}
        <header className="scanner-header-block">
          <div className="scanner-eyebrow">
            <span className="eyebrow-dot" />
            <span>PASSIVE VULNERABILITY ASSESSMENT ENGINE</span>
          </div>
          <h1 className="scanner-main-title">Check Your Website Security</h1>
          <p className="scanner-subtitle">
            Perform non-destructive, passive diagnostics to discover exposed configuration gaps, missing headers, cookie security issues, and cryptographic weaknesses.
          </p>
        </header>

        {/* Scope & Authorization Reminder Banner */}
        <section className="scanner-auth-banner" role="alert" aria-label="Scope and authorization reminder">
          <div className="auth-banner-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="auth-banner-text">
            <span className="auth-banner-strong">Authorization Reminder:</span> Only assess websites you own or have explicit, documented authorization to test. Secure X performs non-destructive GET checks and enforces automated scope boundaries against private networks and localhost to prevent unauthorized scanning.
          </div>
        </section>

        {/* Scan History Drawer Panel (GET /scans and GET /scans/{id}) */}
        {isHistoryOpen && (
          <section className="scan-history-card" aria-label="Saved Scan History Archive">
            <div className="history-card-header">
              <div className="history-header-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <span>SAVED SCAN ARCHIVE (SQLITE)</span>
              </div>

              <div className="history-actions-bar">
                {/* Direct ID Lookup */}
                <form className="direct-id-lookup-form" onSubmit={handleDirectIdSubmit}>
                  <input
                    type="number"
                    min="1"
                    className="id-input-field"
                    placeholder="Scan ID #"
                    value={directScanIdInput}
                    onChange={(e) => setDirectScanIdInput(e.target.value)}
                    aria-label="Direct Scan ID retrieval"
                  />
                  <button type="submit" className="retrieve-btn" disabled={!directScanIdInput.trim()}>
                    Open ID
                  </button>
                </form>

                <button
                  type="button"
                  className="refresh-history-btn"
                  onClick={() => loadHistory(apiBaseUrl)}
                  disabled={isHistoryLoading}
                >
                  {isHistoryLoading ? 'Refreshing...' : 'Refresh'}
                </button>

                <button
                  type="button"
                  className="refresh-history-btn"
                  onClick={() => setIsHistoryOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>

            {historyError && (
              <div className="scanner-error-card" style={{ margin: '0 0 1rem 0' }}>
                <div className="error-body-text">{historyError}</div>
              </div>
            )}

            <div className="history-table-wrap">
              {historyList.length > 0 ? (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Target Website</th>
                      <th>Completed</th>
                      <th>Findings Summary</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((item) => (
                      <tr key={item.scan_id}>
                        <td className="history-id-cell">#{item.scan_id}</td>
                        <td className="history-target-cell" title={item.target}>
                          {item.target}
                        </td>
                        <td className="history-date-cell">
                          {item.finished_at ? new Date(item.finished_at).toLocaleString() : 'Incomplete'}
                        </td>
                        <td className="history-badge-cell">
                          <span className="history-stat-chip total">
                            {item.summary?.total_findings ?? 0} Findings
                          </span>
                          {(item.summary?.high_priority ?? 0) > 0 && (
                            <span className="history-stat-chip crit">
                              {item.summary.high_priority} High Priority
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="history-open-btn"
                            onClick={() => handleSelectHistoryScan(item.scan_id)}
                          >
                            Open Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="history-empty-notice">
                  {isHistoryLoading
                    ? 'Loading saved scan history from SQLite...'
                    : 'No saved scans found in the database. Run a scan above to generate an entry.'}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Input Card Form */}
        <div className="scanner-input-card">
          <form
            className="scanner-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleStartScan()
            }}
          >
            <div className="input-row">
              <div className="url-input-wrapper">
                <span className="url-input-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="url-text-input"
                  placeholder="Enter target domain or URL (e.g. example.com or https://example.com)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isLoading}
                  autoComplete="off"
                  spellCheck="false"
                  aria-label="Target Website URL"
                />
              </div>

              <button
                type="submit"
                className="scan-submit-btn"
                disabled={isLoading || !urlInput.trim()}
              >
                {isLoading ? (
                  <>
                    <svg className="radar-sweep-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="2" x2="12" y2="6" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                      <line x1="2" y1="12" x2="6" y2="12" />
                      <line x1="18" y1="12" x2="22" y2="12" />
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                    </svg>
                    <span>SCANNING...</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>START PASSIVE SCAN</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Presets */}
            <div className="quick-targets-row">
              <span>Quick demo presets:</span>
              <button
                type="button"
                className="quick-target-chip"
                onClick={() => handleQuickPreset('example.com')}
                disabled={isLoading}
              >
                example.com
              </button>
              <button
                type="button"
                className="quick-target-chip"
                onClick={() => handleQuickPreset('https://httpbin.org')}
                disabled={isLoading}
              >
                httpbin.org
              </button>
              <button
                type="button"
                className="quick-target-chip"
                onClick={() => handleQuickPreset('localhost')}
                disabled={isLoading}
                title="Test safety gate rejection"
              >
                localhost (Safety Test)
              </button>
            </div>

            {/* Configurable Backend URL Toolbar */}
            <div className="backend-config-row">
              <div>
                <span>Backend API: </span>
                <code>{apiBaseUrl}</code>
              </div>
              <div>
                <button
                  type="button"
                  className="config-toggle-btn"
                  onClick={() => setIsConfigOpen((prev) => !prev)}
                >
                  {isConfigOpen ? 'Close Settings' : 'Change Backend URL'}
                </button>
              </div>
            </div>

            {isConfigOpen && (
              <div className="config-input-panel">
                <input
                  type="text"
                  className="config-input"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="http://localhost:8000"
                />
                <button
                  type="button"
                  className="quick-target-chip"
                  onClick={handleSaveApiUrl}
                >
                  Save API URL
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Honest Loading State with Dynamic Status Text */}
        {isLoading && (
          <div className="scanner-loading-stage" role="status" aria-live="polite">
            <div className="scanner-radar-wrap">
              <div className="radar-ring pulse-1" />
              <div className="radar-ring pulse-2" />
              <svg className="radar-sweep-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="12" x2="19" y2="5" />
              </svg>
            </div>

            <h3 className="loading-phase-title">ASSESSMENT IN PROGRESS</h3>
            <p className="loading-phase-desc">{HONEST_LOADING_PHASES[loadingPhaseIndex]}</p>
            <p className="loading-honest-note">
              Executing non-destructive passive inspection against the target. Checks are completed synchronously by the Python backend without artificial progress percentages.
            </p>
          </div>
        )}

        {/* Safety Gate Rejection or Backend Error Card */}
        {((report && !report.scan_complete && report.errors.length > 0) || errorMsg) && !isLoading && (
          <div className="scanner-error-card" role="alert">
            <div className="error-header">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{report && !report.scan_complete ? 'SAFETY GATE INTERVENTION' : 'BACKEND COMMUNICATION ERROR'}</span>
            </div>

            <div className="error-body-text">
              {report && !report.scan_complete && report.errors.length > 0 ? (
                report.errors.map((err, i) => <div key={i}>{err}</div>)
              ) : (
                <div>{errorMsg}</div>
              )}
            </div>

            {errorMsg && (
              <div className="error-troubleshoot">
                <strong>Troubleshooting Python Backend:</strong> Ensure the FastAPI server is running on{' '}
                <code>{apiBaseUrl}</code>. Run in a terminal:{' '}
                <code>cd securex &amp;&amp; uvicorn app:app --reload --port 8000</code>.
              </div>
            )}
          </div>
        )}

        {/* Full Scan Report View */}
        {report && report.scan_complete && !isLoading && (
          <section className="scanner-results-section" aria-label="Security Scan Findings">
            {/* Archived Report Banner Notice */}
            {isArchivedView && (
              <div className="retrieved-archive-banner" role="status">
                <div className="archive-banner-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>
                    Viewing Archived Report <strong>#{report.scan_id}</strong> retrieved from SQLite database for <strong>{report.target}</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  className="quick-target-chip"
                  onClick={() => handleStartScan(report.target)}
                >
                  Re-Scan Target Now
                </button>
              </div>
            )}

            {/* Target Meta Information Bar */}
            <div className="results-meta-card">
              <div className="target-meta-left">
                <span className="target-meta-label">TARGET ASSESSMENT COMPLETE</span>
                <span className="target-meta-url">{report.target}</span>
              </div>
              <div className="target-meta-right">
                {report.scan_id && <span>Report ID: #{report.scan_id}</span>}
                {report.finished_at && (
                  <span>Timestamp: {new Date(report.finished_at).toLocaleTimeString()}</span>
                )}

                {/* Download PDF Button */}
                <button
                  type="button"
                  className="pdf-download-btn"
                  onClick={handleDownloadPdf}
                  title="Generate and download executive PDF report"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download Full Report (PDF)</span>
                </button>

                <button
                  type="button"
                  className="reset-scan-btn"
                  onClick={() => {
                    setReport(null)
                    setUrlInput('')
                    setIsArchivedView(false)
                  }}
                >
                  New Scan
                </button>
              </div>
            </div>

            {/* Enhanced Technical Details Bar */}
            <div className="report-meta-details-bar">
              <div className="report-meta-col">
                <span className="report-meta-col-label">Status</span>
                <span className="report-meta-col-value status-complete">
                  {report.scan_complete ? 'Complete (Passive Mode)' : 'Incomplete'}
                </span>
              </div>
              <div className="report-meta-col">
                <span className="report-meta-col-label">Assessment Started</span>
                <span className="report-meta-col-value">
                  {report.started_at ? new Date(report.started_at).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="report-meta-col">
                <span className="report-meta-col-label">Assessment Finished</span>
                <span className="report-meta-col-value">
                  {report.finished_at ? new Date(report.finished_at).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="report-meta-col">
                <span className="report-meta-col-label">Engine Specification</span>
                <span className="report-meta-col-value">Non-Destructive GET &amp; TLS Probes</span>
              </div>
            </div>

            {/* Prominent Estimated Website Safety & Assessed Risk Score Cards */}
            {scanScore && (
              <section className="scan-scores-container" aria-label="Security Posture Scores">
                <div className="scan-scores-grid">
                  {/* Estimated Website Safety Card */}
                  <div className={`score-card safety ${scanScore.status === 'unavailable' ? 'unavailable' : ''}`}>
                    <div className="score-card-header">
                      <span className="score-card-title">Estimated Website Safety</span>
                      <span className="score-rating-badge">
                        {scanScore.status === 'insufficient_evidence'
                          ? 'Insufficient Evidence'
                          : scanScore.rating}
                      </span>
                    </div>

                    <div className="score-card-content">
                      <div className="score-value-block">
                        <span className="score-display-number">
                          {scanScore.safety_score !== null ? `${scanScore.safety_score}%` : 'N/A'}
                        </span>
                        <span className="score-meta-label">
                          {scanScore.status === 'available'
                            ? 'Estimated score based on checks performed'
                            : scanScore.status === 'insufficient_evidence'
                            ? 'Insufficient evidence'
                            : scanScore.status === 'preliminary'
                            ? 'Preliminary Score'
                            : 'Score Unavailable'}
                        </span>
                      </div>

                      <div className="score-gauge-wrap" aria-hidden="true">
                        <svg className="score-gauge-svg" viewBox="0 0 72 72">
                          <circle className="gauge-bg" cx="36" cy="36" r={gaugeRadius} />
                          {scanScore.safety_score !== null && (
                            <circle
                              className="gauge-fill safety"
                              cx="36"
                              cy="36"
                              r={gaugeRadius}
                              strokeDasharray={gaugeCircumference}
                              strokeDashoffset={safetyOffset}
                            />
                          )}
                        </svg>
                        <div className="gauge-center-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="score-bar-track" aria-hidden="true">
                      <div
                        className="score-bar-fill safety"
                        style={{ width: `${scanScore.safety_score ?? 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Assessed Security Risk Card */}
                  <div className={`score-card risk ${scanScore.status === 'unavailable' ? 'unavailable' : ''}`}>
                    <div className="score-card-header">
                      <span className="score-card-title">Assessed Security Risk</span>
                      <span className="score-rating-badge">
                        {scanScore.risk_score !== null ? `${scanScore.risk_score}% Risk` : 'N/A'}
                      </span>
                    </div>

                    <div className="score-card-content">
                      <div className="score-value-block">
                        <span className="score-display-number">
                          {scanScore.risk_score !== null ? `${scanScore.risk_score}%` : 'N/A'}
                        </span>
                        <span className="score-meta-label">
                          {scanScore.status === 'available'
                            ? `Cumulative Deductions: ${scanScore.raw_risk_score} pts`
                            : scanScore.status === 'insufficient_evidence'
                            ? 'Insufficient Evidence'
                            : scanScore.status === 'preliminary'
                            ? 'Preliminary Assessment'
                            : 'Risk Unavailable'}
                        </span>
                      </div>

                      <div className="score-gauge-wrap" aria-hidden="true">
                        <svg className="score-gauge-svg" viewBox="0 0 72 72">
                          <circle className="gauge-bg" cx="36" cy="36" r={gaugeRadius} />
                          {scanScore.risk_score !== null && (
                            <circle
                              className="gauge-fill risk"
                              cx="36"
                              cy="36"
                              r={gaugeRadius}
                              strokeDasharray={gaugeCircumference}
                              strokeDashoffset={riskOffset}
                            />
                          )}
                        </svg>
                        <div className="gauge-center-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="score-bar-track" aria-hidden="true">
                      <div
                        className="score-bar-fill risk"
                        style={{ width: `${scanScore.risk_score ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Score Advisory Bar & Expandable Explanation Toggle */}
                <div className="score-advisory-bar">
                  <div className="score-advisory-text">
                    <strong>Confidence Indicator:</strong> {scanScore.confidence_indicator || 'Evaluated against passive diagnostic checks'}. {scanScore.explanation}
                  </div>
                  <button
                    type="button"
                    className="score-calc-toggle-btn"
                    onClick={() => setIsScoreInfoOpen(!isScoreInfoOpen)}
                    aria-expanded={isScoreInfoOpen}
                  >
                    <span>How is this score calculated?</span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{
                        transform: isScoreInfoOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>

                {/* Expandable Explanation Panel */}
                {isScoreInfoOpen && (
                  <div className="score-calc-panel" role="region" aria-label="Score Calculation Methodology">
                    <h4 className="score-calc-heading">Deterministic Severity-Weighted Scoring Formula</h4>
                    <p className="score-calc-notes">
                      The safety and risk percentages are mathematically consistent (<code>Estimated Website Safety = 100 - Assessed Security Risk</code>)
                      and always bound between 0% and 100%. Scores are calculated directly from verified findings; equivalent issues observed across crawled subpages
                      are deduplicated by finding ID so identical missing headers or forms do not repeatedly penalize the domain.
                    </p>

                    <table className="score-weights-table">
                      <thead>
                        <tr>
                          <th>Finding Severity</th>
                          <th>Base Weight (Confirmed)</th>
                          <th>Heuristic Weight (0.4x)</th>
                          <th>Evaluation Criteria &amp; Rules</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Critical Severity</td>
                          <td className="weight-num crit">25 pts</td>
                          <td className="weight-num crit">10 pts</td>
                          <td>Confirmed database dumps, verified plaintext credentials, or severe exposures</td>
                        </tr>
                        <tr>
                          <td>High Severity</td>
                          <td className="weight-num high">15 pts</td>
                          <td className="weight-num high">6 pts</td>
                          <td>Legacy weak TLS protocols, plaintext login submissions, or exposed archive files</td>
                        </tr>
                        <tr>
                          <td>Medium Severity</td>
                          <td className="weight-num med">6 pts</td>
                          <td className="weight-num med">2.4 pts</td>
                          <td>Missing Content-Security-Policy or HSTS, unverified library indicators, or cookie flags</td>
                        </tr>
                        <tr>
                          <td>Low Severity</td>
                          <td className="weight-num low">2 pts</td>
                          <td className="weight-num low">0.8 pts</td>
                          <td>Missing defense-in-depth headers (X-Frame-Options, Referrer-Policy, etc.)</td>
                        </tr>
                        <tr>
                          <td>Informational</td>
                          <td className="weight-num info">0 pts</td>
                          <td className="weight-num info">0 pts</td>
                          <td>Architectural disclosures and environmental observations without direct risk</td>
                        </tr>
                      </tbody>
                    </table>

                    <p className="score-calc-notes">
                      <strong>Exact Formula:</strong> <code>Raw Risk Score = &Sigma;(Severity Weight &times; Confidence Multiplier)</code> &bull;{' '}
                      <code>Assessed Security Risk = min(100, max(0, round(Raw Risk)))</code> &bull;{' '}
                      <code>Estimated Website Safety = 100 - Assessed Security Risk</code>.
                    </p>
                    <p className="score-calc-notes">
                      <strong>Treatment of Potential Findings:</strong> When evidence is insufficient to verify active exploitation or confirmed file contents,
                      findings are labeled <em>&ldquo;Potential &mdash; manual verification required&rdquo;</em> and weighted with a 0.4x factor.
                      Generic HTML fallback pages and SPA catch-all responses returning HTTP 200 are automatically inspected and suppressed to eliminate false positives.
                    </p>
                    <p className="score-calc-notes">
                      <strong>Coverage Scope Notice:</strong> Scores are estimates based on the checks performed. They do not guarantee that a website is secure or establish the probability that it will be hacked.
                      Passive diagnostic scanning evaluates observable security headers, transport configurations, and exposed endpoints, but does not test authenticated application logic or internal backend systems.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Diagnostic Checks Executed Overview */}
            {report.checks_summary && (
              <section className="checks-execution-overview" aria-label="Diagnostic Checks Breakdown">
                <div className="checks-overview-header">
                  <div className="checks-header-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    <span className="checks-header-title">
                      Diagnostic Checks Executed ({report.checks_summary.total_performed})
                    </span>
                  </div>
                  <span className="checks-coverage-badge">
                    {scanScore?.confidence_indicator || 'Passive Diagnostics'}
                  </span>
                </div>

                <div className="checks-stats-grid">
                  <div className="check-stat-pill passed" title="Security controls verified with no issues found">
                    <span className="stat-num">{report.checks_summary.passed}</span>
                    <span className="stat-label">Passed Checks</span>
                  </div>
                  <div className="check-stat-pill finding" title="Confirmed issues requiring remediation">
                    <span className="stat-num">{report.checks_summary.findings}</span>
                    <span className="stat-label">Findings</span>
                  </div>
                  <div className="check-stat-pill inconclusive" title="Potential observations requiring manual verification">
                    <span className="stat-num">{report.checks_summary.inconclusive}</span>
                    <span className="stat-label">Inconclusive (Potential)</span>
                  </div>
                  <div className="check-stat-pill could-not-run" title="Checks that could not execute due to network or service limits">
                    <span className="stat-num">{report.checks_summary.could_not_run}</span>
                    <span className="stat-label">Could Not Run</span>
                  </div>
                </div>
              </section>
            )}

            {/* Summary Metrics Grid */}
            <div className="summary-metrics-grid">
              <div className="metric-card total">
                <span className="metric-num">{report.summary.total_findings}</span>
                <span className="metric-label">Total Findings</span>
              </div>
              <div className="metric-card critical">
                <span className="metric-num">{report.summary.high_priority}</span>
                <span className="metric-label">High Priority (Crit / High)</span>
              </div>
              <div className="metric-card medium">
                <span className="metric-num">{report.summary.by_severity.MEDIUM}</span>
                <span className="metric-label">Medium Severity</span>
              </div>
              <div className="metric-card low">
                <span className="metric-num">{report.summary.by_severity.LOW + report.summary.by_severity.INFO}</span>
                <span className="metric-label">Low &amp; Informational</span>
              </div>
            </div>

            {/* Findings Filter Toolbar */}
            <div className="findings-toolbar">
              <div className="filter-pill-group" role="tablist" aria-label="Severity Filter">
                <button
                  type="button"
                  className={`filter-pill ${severityFilter === 'ALL' ? 'is-active' : ''}`}
                  onClick={() => setSeverityFilter('ALL')}
                >
                  All ({report.findings.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${severityFilter === 'HIGH_PRIORITY' ? 'is-active' : ''}`}
                  onClick={() => setSeverityFilter('HIGH_PRIORITY')}
                >
                  High Priority ({report.summary.high_priority})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${severityFilter === 'CRITICAL' ? 'is-active' : ''}`}
                  onClick={() => setSeverityFilter('CRITICAL')}
                >
                  Critical ({report.summary.by_severity.CRITICAL})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${severityFilter === 'HIGH' ? 'is-active' : ''}`}
                  onClick={() => setSeverityFilter('HIGH')}
                >
                  High ({report.summary.by_severity.HIGH})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${severityFilter === 'MEDIUM' ? 'is-active' : ''}`}
                  onClick={() => setSeverityFilter('MEDIUM')}
                >
                  Medium ({report.summary.by_severity.MEDIUM})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${severityFilter === 'LOW' ? 'is-active' : ''}`}
                  onClick={() => setSeverityFilter('LOW')}
                >
                  Low ({report.summary.by_severity.LOW})
                </button>
              </div>

              <div>
                <input
                  type="text"
                  className="config-input"
                  style={{ width: '200px' }}
                  placeholder="Filter findings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Filter findings by text"
                />
              </div>
            </div>

            {/* Findings List */}
            {filteredFindings.length > 0 ? (
              <div className="findings-list">
                {filteredFindings.map((f) => (
                  <article key={f.id} className="finding-glass-card">
                    <div className="finding-card-header">
                      <div className="finding-header-left">
                        <div className="finding-cat-row">
                          <span className="finding-category-tag">{f.category_label}</span>
                          {f.confidence === 'heuristic' && (
                            <span className="heuristic-badge" title="Heuristic finding requires manual confirmation">
                              ⚠️ Potential — manual verification required
                            </span>
                          )}
                        </div>
                        <h3 className="finding-card-title">{f.title}</h3>
                      </div>

                      <div className="finding-header-right">
                        <span className={`severity-pill ${f.severity}`}>{f.severity}</span>
                        <span className="status-pill-indicator">{f.status}</span>
                      </div>
                    </div>

                    <div className="finding-card-body">
                      <div className="finding-prop-block">
                        <span className="finding-prop-label risk">RISK CONTEXT</span>
                        <p className="finding-prop-value">{f.risk}</p>
                      </div>

                      <div className="finding-prop-block">
                        <span className="finding-prop-label fix">REMEDIATION GUIDANCE</span>
                        <p className="finding-prop-value">{f.fix}</p>
                      </div>

                      {f.evidence && (
                        <div className="finding-prop-block">
                          <span className="finding-prop-label evidence">TECHNICAL EVIDENCE</span>
                          <div className="finding-evidence-box">
                            <code>{f.evidence}</code>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="zero-findings-card">
                <div className="zero-findings-icon" aria-hidden="true">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h3 className="zero-findings-title">
                  {report.findings.length === 0 ? 'No Passive Issues Detected' : 'No Findings Match Active Filters'}
                </h3>
                <p className="zero-findings-text">
                  {report.findings.length === 0
                    ? 'No configuration weaknesses or missing baseline directives were detected by the passive inspection suite. Note: Passive checks inspect headers, cookies, TLS, and static HTML cues; consider comprehensive source and authorization reviews for full assurance.'
                    : 'Adjust your severity or search query above to view remaining findings.'}
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
