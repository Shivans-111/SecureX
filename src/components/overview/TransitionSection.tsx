import { soundEngine } from '../../utils/soundEngine'

interface TransitionSectionProps {
  onEnterScanner: () => void
}

export function TransitionSection({ onEnterScanner }: TransitionSectionProps) {
  const handleClick = () => {
    soundEngine.playFeedbackBeep()
    onEnterScanner()
  }

  return (
    <section className="overview-section section-transition" id="enter-scan">
      <div className="section-container transition-inner">
        {/* Ambient Glow Orbs */}
        <div className="transition-ambient-orb" aria-hidden="true" />

        <div className="transition-content-block">
          <div className="section-eyebrow">
            <span className="eyebrow-dot" />
            <span>PLATFORM TRANSITION</span>
          </div>

          <h2 className="transition-headline">
            Ready to See Your Website{' '}
            <span className="headline-gradient">Differently?</span>
          </h2>

          <p className="transition-supporting-text">
            Take the next step toward understanding your website's security posture.
          </p>

          {/* Dedicated Glassmorphic CTA */}
          <div className="transition-cta-wrapper">
            <button
              type="button"
              className="premium-glass-cta"
              onClick={handleClick}
              aria-label="Proceed to the Secure X Scanner preview"
            >
              <span className="cta-light-sweep" aria-hidden="true" />
              <span className="cta-content">
                <span className="cta-label">LET'S CHECK YOUR WEBSITE</span>
                <svg className="cta-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </button>
          </div>

          <p className="transition-micro-note">
            Target authorization required prior to assessment initiation.
          </p>
        </div>
      </div>
    </section>
  )
}
