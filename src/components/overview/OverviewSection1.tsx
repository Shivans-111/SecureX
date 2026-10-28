import { useState } from 'react'

export function OverviewSection1() {
  const [activeTab, setActiveTab] = useState<number>(0)

  const challenges = [
    {
      id: 0,
      badge: 'DISCOVERY CHALLENGE',
      title: 'Hidden Weaknesses',
      subtitle: 'Security gaps can go unnoticed.',
      summary:
        'A polished visual front often conceals architectural misconfigurations, legacy endpoints, and unpatched dependencies beneath normal user flows.',
      telemetry: {
        layer: 'Application & API Perimeter',
        metric: 'Surface Visibility: 42%',
        diagnostic: 'Unauthenticated debug route detected on legacy subdomain',
        status: 'Unmonitored Gap',
      },
      accent: 'cyan',
    },
    {
      id: 1,
      badge: 'ANALYSIS CHALLENGE',
      title: 'Complex Findings',
      subtitle: 'Technical reports can be difficult to understand.',
      summary:
        'Standard security scanners generate dense CVE outputs, cryptic strings, and alert fatigue rather than actionable explanations of real-world business impact.',
      telemetry: {
        layer: 'Vulnerability Interpretation',
        metric: 'Noise Ratio: 78% False Urgency',
        diagnostic: 'CVSS 8.2 translated into plain context: session fixation risk',
        status: 'Actionable Context',
      },
      accent: 'gold',
    },
    {
      id: 2,
      badge: 'PRIORITIZATION CHALLENGE',
      title: 'Unclear Priorities',
      subtitle: 'Website owners need to know which issues deserve attention first.',
      summary:
        'When faced with dozens of undifferentiated alerts, development teams struggle to allocate remediation efforts toward the exposures that genuinely threaten user security.',
      telemetry: {
        layer: 'Remediation Roadmap',
        metric: 'Triage Efficiency: 3-Tier Matrix',
        diagnostic: 'Rank 1: Critical Auth Bypass • Rank 2: CSP Header Missing',
        status: 'Sequenced Fixes',
      },
      accent: 'blue',
    },
  ]

  const activeChallenge = challenges[activeTab]

  return (
    <section className="overview-section section-problem" id="mission">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-eyebrow">
            <span className="eyebrow-dot" />
            <span>THE PROBLEM &amp; OUR MISSION</span>
          </div>
          <h2 className="section-headline">
            Every Website Has a Story.{' '}
            <span className="headline-gradient">Find Its Weak Points.</span>
          </h2>
          <p className="section-supporting-text">
            Security issues can remain hidden behind a website's polished interface. Secure X is designed to help website owners understand potential weaknesses, assess their impact, and discover practical ways to improve their security.
          </p>
        </div>

        {/* Asymmetrical Layered Glass Composition */}
        <div className="problem-layered-grid">
          {/* Left Column: Interactive Challenge Switcher Tabs */}
          <div className="challenge-selectors" role="tablist" aria-label="Key Security Challenges">
            {challenges.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={activeTab === i}
                className={`challenge-selector-card ${activeTab === i ? 'is-active' : ''}`}
                onClick={() => setActiveTab(i)}
              >
                <div className="selector-index">0{i + 1}</div>
                <div className="selector-content">
                  <div className="selector-badge">{c.badge}</div>
                  <h3 className="selector-title">{c.title}</h3>
                  <p className="selector-subtitle">{c.subtitle}</p>
                </div>
                <div className="selector-indicator" aria-hidden="true" />
              </button>
            ))}
          </div>

          {/* Right Column: Layered Multi-Plane Glass Telemetry Showcase */}
          <div className="challenge-stage-card">
            <div className="stage-card-backdrop" />
            <div className="stage-card-content">
              {/* Header Bar */}
              <div className="stage-header">
                <div className="stage-header-title">
                  <span className="stage-accent-pill">{activeChallenge.badge}</span>
                  <span className="stage-layer-label">{activeChallenge.telemetry.layer}</span>
                </div>
                <div className="stage-status-indicator">
                  <span className="status-dot-pulse" />
                  <span>{activeChallenge.telemetry.status}</span>
                </div>
              </div>

              {/* Main Challenge Description */}
              <div className="stage-body">
                <h3 className="stage-main-title">{activeChallenge.title}</h3>
                <p className="stage-main-summary">{activeChallenge.summary}</p>
              </div>

              {/* Multi-Plane Telemetry Readout Element */}
              <div className="stage-telemetry-box">
                <div className="telemetry-row">
                  <span className="telemetry-key">EVALUATION METRIC</span>
                  <span className="telemetry-val">{activeChallenge.telemetry.metric}</span>
                </div>
                <div className="telemetry-row">
                  <span className="telemetry-key">DIAGNOSTIC SUMMARY</span>
                  <span className="telemetry-val highlight">{activeChallenge.telemetry.diagnostic}</span>
                </div>
              </div>

              {/* Bottom Architectural Callout */}
              <div className="stage-footer">
                <div className="stage-footer-icon">⚡</div>
                <div className="stage-footer-text">
                  Secure X synthesizes raw technical risk vectors into clear, prioritized mitigation pathways.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
