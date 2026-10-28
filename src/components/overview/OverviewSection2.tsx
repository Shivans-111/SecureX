import { useState } from 'react'

export function OverviewSection2() {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0)

  const steps = [
    {
      stepNumber: '01',
      title: 'Submit Website',
      description: 'The user enters a website URL they own or are explicitly authorized to assess.',
      icon: 'globe',
      detailTag: 'Target Input',
    },
    {
      stepNumber: '02',
      title: 'Validate Scope',
      description: 'The system checks the target and permitted assessment scope before proceeding.',
      icon: 'check-circle',
      detailTag: 'Boundary Check',
    },
    {
      stepNumber: '03',
      title: 'Assess Security',
      description: 'The system runs the security checks that are actually implemented and supported.',
      icon: 'shield',
      detailTag: 'Assessment Engine',
    },
    {
      stepNumber: '04',
      title: 'Explain Findings',
      description: 'Potential weaknesses are presented with supporting evidence, possible impact, and appropriate severity.',
      icon: 'file-text',
      detailTag: 'Impact Analysis',
    },
    {
      stepNumber: '05',
      title: 'Recommend Fixes',
      description: 'The report provides understandable remediation guidance and identifies sensible next steps.',
      icon: 'tool',
      detailTag: 'Remediation Path',
    },
    {
      stepNumber: '06',
      title: 'Verify Improvements',
      description: 'Where supported, the user can re-test after applying a fix to validate the correction.',
      icon: 'refresh-cw',
      detailTag: 'Validation Loop',
    },
  ]

  return (
    <section className="overview-section section-workflow" id="how-it-works">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-eyebrow">
            <span className="eyebrow-dot" />
            <span>HOW SECURE X WORKS</span>
          </div>
          <h2 className="section-headline">
            From Website to{' '}
            <span className="headline-gradient">Actionable Security Insights.</span>
          </h2>
          <p className="section-supporting-text">
            A structured, responsible assessment workflow engineered to provide clear clarity from initial entry to verified resolution.
          </p>
        </div>

        {/* Clear Mandatory Authorization Notice */}
        <div className="authorization-notice-banner" role="note" aria-label="Authorization requirement notice">
          <div className="notice-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="notice-content">
            <span className="notice-lead">Authorization Notice:</span> Security assessments must be authorized and limited to the approved scope.
          </div>
        </div>

        {/* Continuous Process Pipeline Visualization */}
        <div className="workflow-pipeline-container">
          {/* Connecting Illuminated Light Path Line */}
          <div className="pipeline-light-track" aria-hidden="true">
            <div
              className="pipeline-light-progress"
              style={{ width: `${((activeStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Stepped Process Cards Grid */}
          <div className="workflow-steps-grid">
            {steps.map((s, idx) => {
              const isPassed = idx <= activeStepIndex
              const isCurrent = idx === activeStepIndex

              return (
                <div
                  key={s.stepNumber}
                  className={`workflow-step-node ${isPassed ? 'is-passed' : ''} ${isCurrent ? 'is-current' : ''}`}
                  onMouseEnter={() => setActiveStepIndex(idx)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isCurrent}
                  onFocus={() => setActiveStepIndex(idx)}
                >
                  {/* Step Connector Marker */}
                  <div className="node-marker-wrap">
                    <div className="node-marker-pulse" aria-hidden="true" />
                    <div className="node-marker-dot">{s.stepNumber}</div>
                  </div>

                  {/* Step Card Surface */}
                  <div className="node-card">
                    <div className="node-card-glint" aria-hidden="true" />
                    <div className="node-card-header">
                      <span className="node-step-tag">STEP {s.stepNumber}</span>
                      <span className="node-detail-tag">{s.detailTag}</span>
                    </div>
                    <h3 className="node-title">{s.title}</h3>
                    <p className="node-desc">{s.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
