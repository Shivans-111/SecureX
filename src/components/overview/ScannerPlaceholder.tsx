import { soundEngine } from '../../utils/soundEngine'

interface ScannerPlaceholderProps {
  onBackToOverview: () => void
}

export function ScannerPlaceholder({ onBackToOverview }: ScannerPlaceholderProps) {
  const handleBack = () => {
    soundEngine.playFeedbackBeep()
    onBackToOverview()
  }

  return (
    <div className="scanner-placeholder-page" role="region" aria-label="Scanner Destination Preview">
      {/* Background ambient lighting */}
      <div className="placeholder-bg-lighting" aria-hidden="true" />

      {/* Main Glass Stage */}
      <div className="placeholder-card">
        {/* Top telemetry bar */}
        <div className="placeholder-top-bar">
          <div className="placeholder-brand">
            <span className="brand-dot" />
            <span className="brand-name">
              SECURE <span className="brand-accent">X</span>
            </span>
          </div>
          <div className="placeholder-status-pill">
            <span className="pulse-indicator" />
            <span>MODULE DEVELOPMENT IN PROGRESS</span>
          </div>
        </div>

        {/* Central Information Block */}
        <div className="placeholder-body">
          <div className="placeholder-icon-wrap" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>

          <h1 className="placeholder-title">SECURE X SCANNER ENGINE</h1>
          <p className="placeholder-lead">
            The target scope validation engine and assessment modules are currently in active development.
          </p>

          <div className="placeholder-info-box">
            <div className="info-box-title">NEXT ARCHITECTURAL PHASE</div>
            <ul className="info-box-list">
              <li>• RFC-compliant Domain &amp; Path Authorization Protocol</li>
              <li>• Passive HTTP Security Header &amp; Cookie Diagnostics</li>
              <li>• Non-destructive Passive Vulnerability Assessment Modules</li>
            </ul>
          </div>

          <p className="placeholder-notice">
            Zero scans are initiated at this preview stage. All assessments will require verified administrative consent.
          </p>

          {/* Return Button */}
          <div className="placeholder-actions">
            <button
              type="button"
              className="control-btn return-btn"
              onClick={handleBack}
              aria-label="Return to Project Overview"
            >
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>RETURN TO PROJECT OVERVIEW</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
