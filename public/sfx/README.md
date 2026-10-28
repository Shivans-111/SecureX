# Secure X Audio Assets

This directory contains sound effects for the Secure X shield assembly and defense activation sequence.

## Sound Assets

### `shield-lock.mp3` / `shield-lock.wav`
- **Trigger**: Synchronized to play at the exact visual impact moment when both shield halves collide and lock together.
- **Components**:
  1. **Metallic "shing-clank"**: High-frequency sword-sheathing scrape followed by a resonant titanium lock latch.
  2. **Low-Frequency Impact**: Sub-bass thud (40–90 Hz) providing tactile weight without distortion.
  3. **Electrical Activation Hum**: Restrained quantum hum (120 Hz with subtle phase modulation) signaling defense matrix initialization.
- **Specifications**:
  - Sample Rate: 44.1 kHz / 48 kHz
  - Channels: Stereo or Mono
  - Formats supported: `.mp3`, `.wav`
  - Max volume recommended: -1.5 dB True Peak (mastered to prevent clipping)

## Adding or Replacing Custom SFX
To supply your own studio-recorded or licensed audio asset:
1. Place your audio file in this directory as `public/sfx/shield-lock.mp3` (or `shield-lock.wav`).
2. The application automatically detects and plays this file via the Web Audio API / HTML5 Audio pipeline.
3. If an audio file fails to load or is missing, the application automatically falls back to its built-in Web Audio procedural synthesizer, ensuring seamless audio feedback in all environments.
