/**
 * Secure X Audio Engine
 * Handles Web Audio API & HTML5 Audio playback for the shield assembly sequence.
 * 
 * Features:
 * - Starts muted by default to comply with browser autoplay policies.
 * - Supports local audio asset (/sfx/shield-lock.mp3 or /sfx/shield-lock.wav).
 * - Built-in zero-dependency Web Audio procedural synthesizer fallback.
 * - Debounces rapid triggers and prevents re-render duplicate playback.
 * - Clean resource disposal and volume limiting.
 */

class SoundEngine {
  private audioCtx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private audioBuffer: AudioBuffer | null = null
  private isMuted: boolean = true
  private hasInteracted: boolean = false
  private lastPlayTimestamp: number = 0
  private listeners: Set<(muted: boolean) => void> = new Set()
  private isPreloading: boolean = false

  constructor() {
    // Audio context will be lazily initialized on first user gesture
  }

  private initContext() {
    if (this.audioCtx) return

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    try {
      this.audioCtx = new AudioContextClass()
      this.masterGain = this.audioCtx.createGain()
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.72, this.audioCtx.currentTime)
      this.masterGain.connect(this.audioCtx.destination)
    } catch (e) {
      console.warn('AudioContext initialization deferred:', e)
    }
  }

  /**
   * Preload audio file from /sfx/shield-lock.mp3 or /sfx/shield-lock.wav
   */
  public async preloadAudio() {
    if (this.audioBuffer || this.isPreloading) return
    this.isPreloading = true

    this.initContext()
    if (!this.audioCtx) return

    const paths = ['/sfx/shield-lock.mp3', '/sfx/shield-lock.wav']
    for (const url of paths) {
      try {
        const res = await fetch(url)
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer()
          this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuf)
          break
        }
      } catch {
        // Fall back to next format or procedural synthesis
      }
    }
    this.isPreloading = false
  }

  /**
   * Procedural synthesizer fallback generating the exact metallic shing-clank,
   * sub-bass impact, and electrical activation hum directly via Web Audio nodes.
   */
  private playSynthesizedLockSound() {
    if (!this.audioCtx || !this.masterGain) return

    const now = this.audioCtx.currentTime

    // 1. Sword Sheathing / Metallic Shing Friction
    const noiseLength = 0.28
    const noiseBuffer = this.audioCtx.createBuffer(1, Math.floor(this.audioCtx.sampleRate * noiseLength), this.audioCtx.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.audioCtx.sampleRate * 0.08))
    }
    const noiseNode = this.audioCtx.createBufferSource()
    noiseNode.buffer = noiseBuffer

    const noiseFilter = this.audioCtx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.setValueAtTime(4200, now)
    noiseFilter.frequency.exponentialRampToValueAtTime(2600, now + 0.25)
    noiseFilter.Q.setValueAtTime(4.5, now)

    const noiseGain = this.audioCtx.createGain()
    noiseGain.gain.setValueAtTime(0.35, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26)

    noiseNode.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(this.masterGain)
    noiseNode.start(now)

    // 2. High-Frequency Metallic Harmonics (Sword edge resonance)
    const metallicFrequencies = [2850, 3950, 5600]
    metallicFrequencies.forEach((freq, idx) => {
      const osc = this.audioCtx!.createOscillator()
      const g = this.audioCtx!.createGain()
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 60, now)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.75, now + 0.28)

      g.gain.setValueAtTime(0.18 / (idx + 1), now)
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)

      osc.connect(g)
      g.connect(this.masterGain!)
      osc.start(now)
      osc.stop(now + 0.3)
    })

    // 3. Mechanical Clank / Solid Metal Lock Latch (T + 0.06s)
    const lockTime = now + 0.06
    const clankPitches = [440, 880, 1420, 2200]
    clankPitches.forEach((pitch, idx) => {
      const osc = this.audioCtx!.createOscillator()
      const g = this.audioCtx!.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(pitch, lockTime)

      g.gain.setValueAtTime(0.28 / (idx + 1), lockTime)
      g.gain.exponentialRampToValueAtTime(0.0001, lockTime + 0.35)

      osc.connect(g)
      g.connect(this.masterGain!)
      osc.start(lockTime)
      osc.stop(lockTime + 0.36)
    })

    // 4. Low-Frequency Sub-Bass Impact Thud (T + 0.07s)
    const bassTime = now + 0.07
    const bassOsc = this.audioCtx.createOscillator()
    const bassGain = this.audioCtx.createGain()
    bassOsc.type = 'sine'
    bassOsc.frequency.setValueAtTime(95, bassTime)
    bassOsc.frequency.exponentialRampToValueAtTime(38, bassTime + 0.38)

    bassGain.gain.setValueAtTime(0.48, bassTime)
    bassGain.gain.exponentialRampToValueAtTime(0.0001, bassTime + 0.45)

    bassOsc.connect(bassGain)
    bassGain.connect(this.masterGain)
    bassOsc.start(bassTime)
    bassOsc.stop(bassTime + 0.46)

    // 5. Electrical Activation Hum (T + 0.10s to 1.5s)
    const humTime = now + 0.10
    const humOsc = this.audioCtx.createOscillator()
    const humGain = this.audioCtx.createGain()
    humOsc.type = 'sawtooth'
    humOsc.frequency.setValueAtTime(118, humTime)

    // Lowpass to keep it smooth and restrained
    const humFilter = this.audioCtx.createBiquadFilter()
    humFilter.type = 'lowpass'
    humFilter.frequency.setValueAtTime(320, humTime)

    // Subtle tremolo LFO
    const lfo = this.audioCtx.createOscillator()
    const lfoGain = this.audioCtx.createGain()
    lfo.frequency.setValueAtTime(7.5, humTime)
    lfoGain.gain.setValueAtTime(0.04, humTime)
    lfo.connect(lfoGain)
    lfoGain.connect(humGain.gain)

    humGain.gain.setValueAtTime(0.001, humTime)
    humGain.gain.linearRampToValueAtTime(0.12, humTime + 0.15)
    humGain.gain.exponentialRampToValueAtTime(0.0001, humTime + 1.25)

    humOsc.connect(humFilter)
    humFilter.connect(humGain)
    humGain.connect(this.masterGain)

    lfo.start(humTime)
    humOsc.start(humTime)
    lfo.stop(humTime + 1.3)
    humOsc.stop(humTime + 1.3)
  }

  /**
   * Primary entry point: plays the shield lock sequence at collision
   */
  public playShieldLockSound() {
    if (this.isMuted) return

    // Prevent duplicate firing within 600ms (e.g. re-renders or StrictMode)
    const now = performance.now()
    if (now - this.lastPlayTimestamp < 600) return
    this.lastPlayTimestamp = now

    this.initContext()
    if (!this.audioCtx) return

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume()
    }

    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(0.72, this.audioCtx.currentTime)
    }

    // If pre-decoded audio buffer is ready, play buffer source
    if (this.audioBuffer) {
      try {
        const source = this.audioCtx.createBufferSource()
        source.buffer = this.audioBuffer
        source.connect(this.masterGain!)
        source.start(0)
        return
      } catch (err) {
        console.warn('Buffer playback fallback:', err)
      }
    }

    // Procedural synthesizer fallback
    this.playSynthesizedLockSound()
  }

  /**
   * Subtle UI click feedback when unmuting or pressing replay
   */
  public playFeedbackBeep() {
    if (this.isMuted) return
    this.initContext()
    if (!this.audioCtx || !this.masterGain) return

    try {
      const now = this.audioCtx.currentTime
      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08)

      gain.gain.setValueAtTime(0.1, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

      osc.connect(gain)
      gain.connect(this.masterGain)
      osc.start(now)
      osc.stop(now + 0.09)
    } catch {
      // Ignore
    }
  }

  public getMuted(): boolean {
    return this.isMuted
  }

  public getHasInteracted(): boolean {
    return this.hasInteracted
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted
    this.hasInteracted = true

    this.initContext()
    if (this.audioCtx && this.audioCtx.state === 'suspended' && !muted) {
      this.audioCtx.resume()
    }

    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.72, this.audioCtx.currentTime)
    }

    if (!muted) {
      this.preloadAudio()
      this.playFeedbackBeep()
    }

    this.notify()
  }

  public toggleMute() {
    this.setMuted(!this.isMuted)
  }

  public subscribe(cb: (muted: boolean) => void) {
    this.listeners.add(cb)
    return () => {
      this.listeners.delete(cb)
    }
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.isMuted))
  }

  public destroy() {
    this.listeners.clear()
    if (this.audioCtx) {
      try {
        this.audioCtx.close()
      } catch {
        // Ignore
      }
      this.audioCtx = null
    }
  }
}

export const soundEngine = new SoundEngine()
