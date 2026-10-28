import { useState, useRef, useEffect, useCallback } from 'react'
import { SECURITY_CATEGORIES, type SecurityCategory } from './securityCategories'

export function SecurityModulesOrbital() {
  const [rotationAngle, setRotationAngle] = useState(0)
  const [activeCategory, setActiveCategory] = useState<SecurityCategory>(SECURITY_CATEGORIES[0])
  const [isPaused, setIsPaused] = useState(false)
  const [isReducedMotion, setIsReducedMotion] = useState(false)

  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(performance.now())

  // Check user's motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setIsReducedMotion(mq.matches)

    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Smooth orbital rotation loop
  useEffect(() => {
    if (isReducedMotion) return

    const tick = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now

      if (!isPaused) {
        // Slow continuous rotation (approx 45 seconds for full 360° orbit)
        setRotationAngle((prev) => (prev + delta * 0.14) % (Math.PI * 2))
      }

      animationFrameRef.current = requestAnimationFrame(tick)
    }

    lastTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPaused, isReducedMotion])

  const handleSelectCategory = useCallback((cat: SecurityCategory) => {
    setActiveCategory(cat)
  }, [])

  const total = SECURITY_CATEGORIES.length

  // Elliptical orbital parameters
  const radiusX = 340 // horizontal spread (px)
  const radiusY = 110 // vertical perspective tilt (px)

  return (
    <div className="security-orbital-container" aria-label="12 Security Assessment Categories Visualization">
      {/* Disclaimer Subheading */}
      <div className="orbital-header-badge">
        <span className="orbital-dot"></span>
        <span>ASSESSMENT DOMAIN ARCHITECTURE</span>
      </div>

      {/* Main 3D Orbital Stage */}
      <div
        className="orbital-stage"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Orbital Track Ring SVG Background */}
        <svg className="orbital-track-svg" viewBox="0 0 800 360" aria-hidden="true">
          <defs>
            <linearGradient id="orbitalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38dfff" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#2468c9" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#d9ae55" stopOpacity="0.35" />
            </linearGradient>
            <filter id="orbitalGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <ellipse
            cx="400"
            cy="180"
            rx="340"
            ry="110"
            fill="none"
            stroke="url(#orbitalGrad)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            filter="url(#orbitalGlow)"
          />
        </svg>

        {/* Central Inspection Hub */}
        <div className="orbital-central-hub" aria-live="polite">
          <div className="hub-radar-ring" aria-hidden="true" />
          <div className="hub-badge">CATEGORY INSPECTION</div>
          <div className="hub-code">{activeCategory.code}</div>
          <h4 className="hub-title">{activeCategory.name}</h4>
          <p className="hub-desc">{activeCategory.description}</p>
          <div className="hub-meta">
            <span className="hub-tag">Focus: {activeCategory.focusArea}</span>
            <span className="hub-index">[{String(activeCategory.id).padStart(2, '0')}/12]</span>
          </div>
        </div>

        {/* 12 Floating Orbital Glass Modules */}
        <div className="orbital-nodes-track">
          {SECURITY_CATEGORIES.map((category, index) => {
            // Position on ellipse
            const baseAngle = (index / total) * Math.PI * 2
            const currentAngle = (baseAngle + rotationAngle) % (Math.PI * 2)

            const cosA = Math.cos(currentAngle)
            const sinA = Math.sin(currentAngle)

            // 3D coordinates
            const x = cosA * radiusX
            const y = sinA * radiusY
            // Depth: sinA ranges from -1 (back) to +1 (front)
            const depthFactor = (sinA + 1) / 2 // 0 (furthest back) to 1 (closest front)
            const scale = 0.82 + depthFactor * 0.28
            const opacity = 0.50 + depthFactor * 0.50
            const zIndex = Math.round(depthFactor * 100)

            const isSelected = activeCategory.id === category.id
            const isFront = depthFactor > 0.85

            return (
              <button
                key={category.id}
                type="button"
                className={`orbital-module-card ${isSelected ? 'is-selected' : ''} ${isFront ? 'is-front' : ''}`}
                style={{
                  transform: `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${scale})`,
                  opacity,
                  zIndex,
                }}
                onClick={() => handleSelectCategory(category)}
                onMouseEnter={() => handleSelectCategory(category)}
                onFocus={() => {
                  setIsPaused(true)
                  handleSelectCategory(category)
                }}
                onBlur={() => setIsPaused(false)}
                title={`Assessment Category ${category.code}: ${category.name}`}
                aria-label={`${category.code} - ${category.name}`}
              >
                <div className="module-card-glint" aria-hidden="true" />
                <div className="module-header">
                  <span className="module-code">{category.code}</span>
                  <span className="module-status-dot" aria-hidden="true" />
                </div>
                <div className="module-body">
                  <span className="module-label">{category.shortLabel}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Central Ring Label & Disclaimer */}
      <div className="orbital-caption-block">
        <h3 className="orbital-center-heading">12 SECURITY ASSESSMENT CATEGORIES</h3>
        <p className="orbital-disclaimer">
          Selected assessment categories inspired by OWASP guidance. Realized capabilities align with implemented and validated platform checks.
        </p>
      </div>

      {/* Accessible Static Grid for Mobile / Reduced Motion */}
      <div className="orbital-accessible-grid">
        {SECURITY_CATEGORIES.map((cat) => (
          <div
            key={`grid-${cat.id}`}
            className={`accessible-category-item ${activeCategory.id === cat.id ? 'is-active' : ''}`}
            onClick={() => handleSelectCategory(cat)}
          >
            <div className="item-code">{cat.code}</div>
            <div className="item-name">{cat.name}</div>
            <div className="item-focus">{cat.focusArea}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
