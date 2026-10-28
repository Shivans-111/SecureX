import { useState } from 'react'
import { SecurityModulesOrbital } from './SecurityModulesOrbital'

export function OverviewSection3() {
  const [selectedOutcomeIndex, setSelectedOutcomeIndex] = useState(0)

  const outcomes = [
    {
      title: 'Security Findings',
      tagline: 'A clear description of a detected or potential issue.',
      description:
        'Technical observations are presented in transparent, structured language—distinguishing confirmed configuration gaps from potential security exposures without confusing jargon.',
      previewId: 'SEC-402',
      previewTitle: 'Cross-Origin Resource Sharing (CORS) Permissive Header',
      severity: 'MODERATE RISK',
      severityClass: 'is-amber',
      evidence: 'Access-Control-Allow-Origin contains wildcard with credentials flag enabled',
    },
    {
      title: 'Risk Context',
      tagline: 'Why the issue may matter and what evidence supports the assessment.',
      description:
        'Rather than abstract CVSS numbers, findings detail the specific attack vectors, exposure pathways, and data confidentiality impacts relevant to your site.',
      previewId: 'SEC-218',
      previewTitle: 'Missing Strict-Transport-Security (HSTS) Directive',
      severity: 'LOW RISK',
      severityClass: 'is-blue',
      evidence: 'Max-age directive absent in production HTTP response headers',
    },
    {
      title: 'Prioritized Guidance',
      tagline: 'Recommended next steps based on severity, impact, and available evidence.',
      description:
        'Actionable, developer-friendly remediation guidance sequenced by real threat severity so your engineering resources focus on high-impact corrections first.',
      previewId: 'SEC-105',
      previewTitle: 'Session Cookie Missing SameSite & Secure Flags',
      severity: 'HIGH RISK',
      severityClass: 'is-red',
      evidence: 'Authentication session token set via unencrypted transport channel',
    },
    {
      title: 'Remediation Tracking',
      tagline: 'A way to organize fixes and verify improvements where supported.',
      description:
        'Keep track of implemented patches and re-evaluate targeted endpoints to ensure corrections successfully close identified vulnerabilities.',
      previewId: 'SEC-044',
      previewTitle: 'Subresource Integrity (SRI) Hash Check',
      severity: 'RESOLVED',
      severityClass: 'is-green',
      evidence: 'Cryptographic SHA-384 integrity hash confirmed for CDN scripts',
    },
  ]

  const activeOutcome = outcomes[selectedOutcomeIndex]

  return (
    <section className="overview-section section-deliverables" id="deliverables">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-eyebrow">
            <span className="eyebrow-dot" />
            <span>WHAT SECURE X AIMS TO DELIVER</span>
          </div>
          <h2 className="section-headline">
            Know the Risk.{' '}
            <span className="headline-gradient">Understand the Fix.</span>
          </h2>
          <p className="section-supporting-text">
            Bridging the divide between automated technical inspection and practical remediation through structured risk transparency.
          </p>
        </div>

        {/* 1. Four Core Deliverable Pillars & Interactive Report Preview */}
        <div className="deliverables-grid">
          {/* Four Outcome Selector Tabs */}
          <div className="outcomes-nav-list" role="tablist" aria-label="Planned Platform Outcomes">
            {outcomes.map((o, idx) => (
              <button
                key={o.title}
                type="button"
                role="tab"
                aria-selected={selectedOutcomeIndex === idx}
                className={`outcome-nav-item ${selectedOutcomeIndex === idx ? 'is-active' : ''}`}
                onClick={() => setSelectedOutcomeIndex(idx)}
              >
                <div className="outcome-item-badge">0{idx + 1}</div>
                <div className="outcome-item-text">
                  <h3 className="outcome-item-title">{o.title}</h3>
                  <p className="outcome-item-tagline">{o.tagline}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Illustrative Report Preview Showcase */}
          <div className="illustrative-report-container">
            {/* Required Accuracy Label */}
            <div className="report-disclaimer-pill" role="note">
              <span className="disclaimer-dot" />
              <span>Illustrative interface — actual findings depend on implemented and validated checks.</span>
            </div>

            {/* Frosted Glass Report Card */}
            <div className="report-glass-mockup">
              <div className="report-header-bar">
                <div className="report-window-controls">
                  <span className="ctrl-dot red" />
                  <span className="ctrl-dot yellow" />
                  <span className="ctrl-dot green" />
                </div>
                <div className="report-target-meta">
                  <span className="meta-protocol">AUDIT TARGET:</span>
                  <span className="meta-domain">https://example.com/api/v1</span>
                </div>
                <div className={`report-severity-badge ${activeOutcome.severityClass}`}>
                  {activeOutcome.severity}
                </div>
              </div>

              <div className="report-finding-body">
                <div className="finding-id-tag">{activeOutcome.previewId}</div>
                <h4 className="finding-headline">{activeOutcome.previewTitle}</h4>
                <p className="finding-explanation">{activeOutcome.description}</p>

                <div className="evidence-panel">
                  <div className="evidence-header">
                    <span className="evidence-label">EVALUATION EVIDENCE</span>
                    <span className="evidence-mode">PASSIVE INSPECTION</span>
                  </div>
                  <div className="evidence-code-box">
                    <code>{activeOutcome.evidence}</code>
                  </div>
                </div>

                <div className="remediation-guidance-box">
                  <div className="remediation-title">RECOMMENDED MITIGATION</div>
                  <p className="remediation-step">
                    Update response policies to explicitly declare validated origin origins and secure attributes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Additional Feature: Animated 12 Security Assessment Categories */}
        <div className="orbital-feature-wrapper">
          <SecurityModulesOrbital />
        </div>
      </div>
    </section>
  )
}
