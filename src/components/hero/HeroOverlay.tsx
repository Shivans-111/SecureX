import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { useSoundState } from '../../utils/useSoundState'

interface HeroOverlayProps {
  visible: boolean
  onReplay?: () => void
}

/**
 * Clean Foreground Typography & Controls Overlay:
 * - Brand mark at top-left.
 * - Replay and Audio On/Off controls at top-right.
 * - Bold futuristic uppercase 'WELCOME TO SECURE X' in dark-red neon with restrained white highlight.
 * - Clean white tagline 'Secure X — Let's secure your website against future attacks.'
 * - Seamlessly integrated without oversized boxes or fake claims.
 */
export function HeroOverlay({ visible, onReplay }: HeroOverlayProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const { isMuted, toggleSound } = useSoundState()

  useEffect(() => {
    if (!contentRef.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!visible) {
      gsap.to(contentRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: 'power2.in',
      })
      return
    }

    if (prefersReducedMotion) {
      gsap.set(contentRef.current, { opacity: 1, y: 0 })
      return
    }

    // Smooth cinematic fade-in after assembly impact
    gsap.fromTo(
      contentRef.current,
      {
        opacity: 0,
        y: 24,
      },
      {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: 'power3.out',
        delay: 0.1,
      }
    )
  }, [visible])

  return (
    <div className="hero-overlay">
      {/* Top Navigation Bar */}
      <header className="hero-nav">
        <div className="brand-logo">
          <span className="brand-dot"></span>
          <span className="brand-name">
            SECURE <span className="brand-accent">X</span>
          </span>
        </div>

        {/* System & Audio Controls */}
        <div className="nav-controls">
          {/* Replay Assembly Button */}
          {visible && onReplay && (
            <button
              type="button"
              className="control-btn replay-btn"
              onClick={onReplay}
              title="Replay shield assembly sequence"
              aria-label="Replay shield assembly sequence"
            >
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>REPLAY</span>
            </button>
          )}

          {/* Audio Toggle Control */}
          <button
            type="button"
            className={`control-btn sound-toggle-btn ${isMuted ? 'is-muted' : 'is-unmuted'}`}
            onClick={toggleSound}
            aria-label={isMuted ? 'Enable sound' : 'Mute sound'}
            title={isMuted ? 'Click to enable audio' : 'Audio active. Click to mute'}
          >
            {isMuted ? (
              <>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
                <span>ENABLE SOUND</span>
              </>
            ) : (
              <>
                <svg className="btn-icon sound-wave-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
                <span>AUDIO ON</span>
              </>
            )}
          </button>

          {/* System Status Pill */}
          <div className="system-status">
            <span className={`status-pill ${visible ? 'status-active' : 'status-syncing'}`}>
              <span className="pulse-indicator"></span>
              {visible ? 'DEFENSE MATRIX ACTIVE' : 'QUANTUM LOCK IN PROGRESS'}
            </span>
          </div>
        </div>
      </header>

      {/* Seamless Integrated Typography Container positioned beneath the shield */}
      <div
        ref={contentRef}
        className={`hero-content ${visible ? 'is-visible' : 'is-hidden'}`}
      >
        <h1 className="neon-red-heading" id="hero-title">
          WELCOME TO SECURE X
        </h1>
        <p className="hero-tagline">
          Secure X — Let's secure your website against future attacks.
        </p>

        {/* Audio helper notice if visitor hasn't enabled sound yet */}
        {isMuted && (
          <div className="audio-hint-pill" onClick={toggleSound}>
            <span className="hint-icon">🔊</span>
            <span>Enable sound to hear the metallic lock and activation hum</span>
          </div>
        )}
      </div>
    </div>
  )
}
