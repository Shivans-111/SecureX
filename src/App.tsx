import { useState, useCallback, useEffect } from 'react'
import { ShieldCanvas } from './components/hero/ShieldCanvas'
import { HeroOverlay } from './components/hero/HeroOverlay'
import { soundEngine } from './utils/soundEngine'
import { OverviewSection1 } from './components/overview/OverviewSection1'
import { OverviewSection2 } from './components/overview/OverviewSection2'
import { OverviewSection3 } from './components/overview/OverviewSection3'
import { TransitionSection } from './components/overview/TransitionSection'
import { ScannerView } from './components/scanner/ScannerView'
import './components/overview/Overview.css'
import './App.css'

export default function App() {
  const [isAssembled, setIsAssembled] = useState(false)
  const [replayKey, setReplayKey] = useState(0)
  const [currentRoute, setCurrentRoute] = useState<'home' | 'scan'>(() => {
    return typeof window !== 'undefined' && window.location.pathname === '/scan' ? 'scan' : 'home'
  })

  // Synchronize route state with browser history (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname === '/scan' ? 'scan' : 'home')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleShieldAssembled = useCallback(() => {
    setIsAssembled(true)
  }, [])

  const handleReplay = useCallback(() => {
    setIsAssembled(false)
    soundEngine.playFeedbackBeep()
    setReplayKey((prev) => prev + 1)
  }, [])

  const handleEnterScanner = useCallback(() => {
    window.history.pushState({}, '', '/scan')
    setCurrentRoute('scan')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleBackToOverview = useCallback(() => {
    window.history.pushState({}, '', '/')
    setCurrentRoute('home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // If visiting /scan route, display active scanner view connected to backend
  if (currentRoute === 'scan') {
    return <ScannerView onBackToOverview={handleBackToOverview} />
  }

  return (
    <div className="securex-app">
      {/* 1. Cinematic Landing Page (Preserved) */}
      <main className="hero-section">
        {/* Cinematic Quantum Computing Laboratory Background Image */}
        <div className="hero-background-image" aria-hidden="true" />

        {/* 3D WebGL Scene with Deep Metallic Sapphire Procedural Shield */}
        <ShieldCanvas onAssembled={handleShieldAssembled} replayKey={replayKey} />

        {/* Futuristic Typography, Audio Controls, and Telemetry Overlay */}
        <HeroOverlay visible={isAssembled} onReplay={handleReplay} />
      </main>

      {/* 2. Three-Section Scroll Overview Container */}
      <div className="overview-wrapper">
        {/* Section 1 — The Problem and Our Mission */}
        <OverviewSection1 />

        {/* Section 2 — How Secure X Works */}
        <OverviewSection2 />

        {/* Section 3 — What Secure X Aims to Deliver & Animated 12 Security Categories Orbital */}
        <OverviewSection3 />

        {/* Final Transition — Enter the Secure X Experience */}
        <TransitionSection onEnterScanner={handleEnterScanner} />
      </div>
    </div>
  )
}
