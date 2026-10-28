import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useLoader } from '@react-three/fiber'
import gsap from 'gsap'
import { soundEngine } from '../../utils/soundEngine'
import { createCreasedHalfShieldGeometry } from './shieldGeometries'

interface ShieldCoreProps {
  onAssembled: () => void
  replayKey?: number
}

// Visual separation distance: clearly separated, balanced
const INITIAL_SEP_X = 1.25

export function ShieldCore({ onAssembled, replayKey = 0 }: ShieldCoreProps) {
  const rootGroupRef = useRef<THREE.Group>(null)
  const leftHalfRef = useRef<THREE.Group>(null)
  const rightHalfRef = useRef<THREE.Group>(null)

  // Load high-resolution brushed titanium texture with engraved circuitry
  const shieldTexture = useLoader(THREE.TextureLoader, '/images/shield-metal-texture.jpg')

  useEffect(() => {
    if (shieldTexture) {
      shieldTexture.wrapS = THREE.RepeatWrapping
      shieldTexture.wrapT = THREE.RepeatWrapping
      shieldTexture.anisotropy = 16
      shieldTexture.colorSpace = THREE.SRGBColorSpace
      shieldTexture.needsUpdate = true
    }
  }, [shieldTexture])

  // Procedural Deep Sapphire Blue Metal Canvas Texture with Royal Blue Highlights & Circuits
  const blueMetalTexture = useMemo(() => {
    if (!shieldTexture || !shieldTexture.image) return null
    const img = shieldTexture.image
    const width = img.width || 1024
    const height = img.height || 1024

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // 1. Base Gradient: Guaranteed Deep Sapphire Blue (#123B78) with Royal Blue (#2468C9) highlights
    const grad = ctx.createLinearGradient(0, 0, width, height)
    grad.addColorStop(0, '#0a224a')
    grad.addColorStop(0.35, '#123B78') // Primary deep sapphire
    grad.addColorStop(0.65, '#2468C9') // Royal blue focal highlight
    grad.addColorStop(1.0, '#0e2b58') // Deep navy foundation
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    // 2. Blend the brushed titanium & circuit details into the blue
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(img, 0, 0, width, height)

    // 3. Re-tint so the texture itself is rich metallic sapphire blue (zero grey/white)
    ctx.globalCompositeOperation = 'color'
    ctx.fillStyle = '#184c94'
    ctx.fillRect(0, 0, width, height)

    // 4. Subtle cyber circuitry luminescence in electric royal-blue (#2468C9)
    ctx.globalCompositeOperation = 'screen'
    ctx.drawImage(img, 0, 0, width, height)
    ctx.fillStyle = 'rgba(36, 104, 201, 0.25)'
    ctx.fillRect(0, 0, width, height)

    ctx.globalCompositeOperation = 'source-over'

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.anisotropy = 16
    tex.colorSpace = THREE.SRGBColorSpace
    tex.needsUpdate = true
    return tex
  }, [shieldTexture])

  // Dual Blue and Gold Impact Flash Lights
  const seamLightBlueRef = useRef<THREE.PointLight>(null)
  const seamLightGoldRef = useRef<THREE.PointLight>(null)
  const seamBeamRef = useRef<THREE.Mesh>(null)
  const shockwaveRef = useRef<THREE.Mesh>(null)

  // Mouse tilt tracking state (subtle rotation only, completely decoupled from lighting)
  const mouseTarget = useRef({ x: 0, y: 0 })
  const mouseCurrent = useRef({ x: 0, y: 0 })

  // Geometries memoization with creased normals for smooth, artifact-free metallic shading
  const leftGeometry = useMemo(() => {
    return createCreasedHalfShieldGeometry(true)
  }, [])

  const rightGeometry = useMemo(() => {
    return createCreasedHalfShieldGeometry(false)
  }, [])

  // Realistic deep metallic sapphire blue materials (no clearcoat white reflection layer)
  const materials = useMemo(() => {
    const activeMap = blueMetalTexture || shieldTexture

    return {
      // 1. Primary Deep Sapphire Metallic Armor Body (~#123B78 with #2468C9 highlights)
      armorPlate: new THREE.MeshStandardMaterial({
        color: '#123B78',
        map: activeMap,
        bumpMap: shieldTexture,
        bumpScale: 0.035,
        roughnessMap: shieldTexture,
        roughness: 0.40,
        metalness: 0.48,
      }),
      // 2. Luminous Cyan Outer Rim Accents (~#38DFFF)
      cyanRim: new THREE.MeshStandardMaterial({
        color: '#38DFFF',
        emissive: '#0ea5e9',
        emissiveIntensity: 0.65,
        metalness: 0.82,
        roughness: 0.22,
      }),
      // 3. Restrained Cyber Gold Trim Accents (~#D9AE55)
      goldTrim: new THREE.MeshStandardMaterial({
        color: '#D9AE55',
        metalness: 0.90,
        roughness: 0.20,
      }),
      // 4. Quantum seam energy nodes
      seamCore: new THREE.MeshStandardMaterial({
        color: '#38DFFF',
        emissive: '#00d4ff',
        emissiveIntensity: 1.8,
        roughness: 0.15,
      }),
    }
  }, [blueMetalTexture, shieldTexture])

  // Mouse movement listener: strictly subtle angular parallax without brightness changes
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      mouseTarget.current.x = nx
      mouseTarget.current.y = ny
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  // GSAP Animation Timeline for the Two Halves Assembly
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      if (leftHalfRef.current) leftHalfRef.current.position.set(0, 0, 0)
      if (rightHalfRef.current) rightHalfRef.current.position.set(0, 0, 0)
      onAssembled()
      return
    }

    // Set initial separated positions with subtle cyber angle
    if (leftHalfRef.current) {
      leftHalfRef.current.position.set(-INITIAL_SEP_X, 0, -0.06)
      leftHalfRef.current.rotation.set(0.02, -0.18, -0.03)
    }
    if (rightHalfRef.current) {
      rightHalfRef.current.position.set(INITIAL_SEP_X, 0, -0.06)
      rightHalfRef.current.rotation.set(0.02, 0.18, 0.03)
    }
    if (rootGroupRef.current) {
      rootGroupRef.current.position.set(0, 0, 0)
    }
    if (shockwaveRef.current) {
      shockwaveRef.current.scale.set(0, 0, 0)
      const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline()

      // Phase 1: Initial 2-second apart preview with subtle magnetic levitation
      tl.to(
        leftHalfRef.current!.position,
        {
          y: 0.025,
          duration: 1.0,
          yoyo: true,
          repeat: 1,
          ease: 'sine.inOut',
        },
        0
      )
      tl.to(
        rightHalfRef.current!.position,
        {
          y: -0.025,
          duration: 1.0,
          yoyo: true,
          repeat: 1,
          ease: 'sine.inOut',
        },
        0
      )

      // Phase 2: After 2.0s, accelerate both halves toward the center
      const assembleStart = 2.0
      const assembleDuration = 0.90

      tl.to(
        leftHalfRef.current!.position,
        {
          x: 0,
          y: 0,
          z: 0,
          duration: assembleDuration,
          ease: 'power3.in',
        },
        assembleStart
      )
      tl.to(
        leftHalfRef.current!.rotation,
        {
          x: 0,
          y: 0,
          z: 0,
          duration: assembleDuration,
          ease: 'power3.in',
        },
        assembleStart
      )

      tl.to(
        rightHalfRef.current!.position,
        {
          x: 0,
          y: 0,
          z: 0,
          duration: assembleDuration,
          ease: 'power3.in',
        },
        assembleStart
      )
      tl.to(
        rightHalfRef.current!.rotation,
        {
          x: 0,
          y: 0,
          z: 0,
          duration: assembleDuration,
          ease: 'power3.in',
        },
        assembleStart
      )

      // Phase 3: EXACT IMPACT COLLISION MOMENT (T = 2.90s)
      const impactTime = assembleStart + assembleDuration
      tl.add('impact', impactTime)

      // Synchronize sound playback and activation callback
      tl.call(
        () => {
          soundEngine.playShieldLockSound()
          onAssembled()
        },
        [],
        'impact'
      )

      // Controlled mechanical recoil on both halves
      tl.to(
        leftHalfRef.current!.position,
        {
          x: -0.052,
          duration: 0.065,
          ease: 'power2.out',
        },
        'impact'
      )
      tl.to(
        leftHalfRef.current!.position,
        {
          x: 0,
          duration: 0.15,
          ease: 'power2.inOut',
        },
        'impact+=0.065'
      )

      tl.to(
        rightHalfRef.current!.position,
        {
          x: 0.052,
          duration: 0.065,
          ease: 'power2.out',
        },
        'impact'
      )
      tl.to(
        rightHalfRef.current!.position,
        {
          x: 0,
          duration: 0.15,
          ease: 'power2.inOut',
        },
        'impact+=0.065'
      )

      // Controlled root group recoil vibration
      if (rootGroupRef.current) {
        tl.to(
          rootGroupRef.current.position,
          {
            z: 0.12,
            duration: 0.07,
            yoyo: true,
            repeat: 1,
            ease: 'power1.inOut',
          },
          'impact'
        )
      }

      // Central Seam Energy Flash (controlled, non-blinding)
      if (seamLightBlueRef.current) {
        tl.to(
          seamLightBlueRef.current,
          {
            intensity: 2.5,
            duration: 0.08,
            ease: 'power2.in',
          },
          'impact'
        )
        tl.to(
          seamLightBlueRef.current,
          {
            intensity: 0.25,
            duration: 0.5,
            ease: 'power2.out',
          },
          'impact+=0.08'
        )
      }

      if (seamLightGoldRef.current) {
        tl.to(
          seamLightGoldRef.current,
          {
            intensity: 2.0,
            duration: 0.08,
            ease: 'power2.in',
          },
          'impact'
        )
        tl.to(
          seamLightGoldRef.current,
          {
            intensity: 0.1,
            duration: 0.4,
            ease: 'power2.out',
          },
          'impact+=0.08'
        )
      }

      if (seamBeamRef.current) {
        tl.to(
          seamBeamRef.current.scale,
          {
            y: 1,
            x: 1.5,
            duration: 0.12,
            ease: 'expo.out',
          },
          'impact'
        )
        tl.to(
          (seamBeamRef.current.material as THREE.MeshBasicMaterial),
          {
            opacity: 0,
            duration: 0.40,
            ease: 'power2.out',
          },
          'impact+=0.10'
        )
      }

      // Radial shockwave burst ring expanding from lock point
      if (shockwaveRef.current) {
        const swMat = shockwaveRef.current.material as THREE.MeshBasicMaterial
        tl.to(
          swMat,
          {
            opacity: 0.85,
            duration: 0.05,
          },
          'impact'
        )
        tl.to(
          shockwaveRef.current.scale,
          {
            x: 2.2,
            y: 2.2,
            z: 2.2,
            duration: 0.45,
            ease: 'power2.out',
          },
          'impact'
        )
        tl.to(
          swMat,
          {
            opacity: 0,
            duration: 0.4,
            ease: 'power2.out',
          },
          'impact+=0.05'
        )
      }
    })

    return () => ctx.revert()
  }, [onAssembled, replayKey])

  // Frame tick: subtle restrained 3D parallax angle (never causes face reflection washout)
  useFrame((_, delta) => {
    const factor = Math.min(delta * 4.0, 1)
    mouseCurrent.current.x += (mouseTarget.current.x - mouseCurrent.current.x) * factor
    mouseCurrent.current.y += (mouseTarget.current.y - mouseCurrent.current.y) * factor

    if (rootGroupRef.current) {
      rootGroupRef.current.rotation.y = mouseCurrent.current.x * 0.06
      rootGroupRef.current.rotation.x = -mouseCurrent.current.y * 0.04
    }
  })

  return (
    <group ref={rootGroupRef} position={[0, 0, 0]}>
      {/* Central Seam Dual Blue & Gold Impact Flash Lights */}
      <pointLight
        ref={seamLightBlueRef}
        position={[0, 0, 0.35]}
        color="#38DFFF"
        intensity={0}
        distance={5}
        decay={2}
      />
      <pointLight
        ref={seamLightGoldRef}
        position={[0, 0, 0.35]}
        color="#D9AE55"
        intensity={0}
        distance={4}
        decay={2}
      />

      {/* Central Seam Quantum Beam Flash */}
      <mesh
        ref={seamBeamRef}
        position={[0, -0.15, 0.19]}
        scale={[1, 0, 1]}
      >
        <planeGeometry args={[0.045, 3.8]} />
        <meshBasicMaterial
          color="#38dfff"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Radial Shockwave Ring */}
      <mesh ref={shockwaveRef} position={[0, -0.1, 0.2]} scale={[0, 0, 0]}>
        <ringGeometry args={[0.2, 0.32, 32]} />
        <meshBasicMaterial
          color="#38DFFF"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* LEFT HALF (Solid Deep Metallic Sapphire Blue Body #123B78) */}
      <group ref={leftHalfRef}>
        {/* Main deep sapphire metallic armor body with royal blue highlights & circuits */}
        <mesh geometry={leftGeometry} material={materials.armorPlate} />

        {/* Luminous cyan outer rim accent (#38DFFF) */}
        <mesh position={[-1.46, 0.7, 0.16]} rotation={[0, 0, 0.12]}>
          <boxGeometry args={[0.035, 1.35, 0.025]} />
          <primitive object={materials.cyanRim} attach="material" />
        </mesh>
        <mesh position={[-0.96, -1.2, 0.15]} rotation={[0, 0, -0.42]}>
          <boxGeometry args={[0.035, 1.25, 0.025]} />
          <primitive object={materials.cyanRim} attach="material" />
        </mesh>

        {/* Restrained cyber gold accent (#D9AE55) along top crest */}
        <mesh position={[-0.85, 1.76, 0.19]} rotation={[0, 0, -0.16]}>
          <boxGeometry args={[0.55, 0.035, 0.025]} />
          <primitive object={materials.goldTrim} attach="material" />
        </mesh>
        {/* Restrained gold accent along upper flank */}
        <mesh position={[-1.42, 1.42, 0.18]} rotation={[0, 0, 0.52]}>
          <boxGeometry args={[0.26, 0.032, 0.022]} />
          <primitive object={materials.goldTrim} attach="material" />
        </mesh>

        {/* Central Seam Interlocking Teeth & Quantum Pins */}
        {[-0.8, 0.1, 1.0].map((yPos, i) => (
          <group key={`l-tooth-${i}`} position={[-0.015, yPos, 0.09]}>
            <mesh>
              <boxGeometry args={[0.03, 0.14, 0.08]} />
              <primitive object={materials.armorPlate} attach="material" />
            </mesh>
            <mesh position={[0, 0, 0.042]}>
              <boxGeometry args={[0.018, 0.08, 0.018]} />
              <primitive object={materials.seamCore} attach="material" />
            </mesh>
          </group>
        ))}
      </group>

      {/* RIGHT HALF (Strictly Symmetrical Solid Body #123B78) */}
      <group ref={rightHalfRef}>
        {/* Main deep sapphire metallic armor body with royal blue highlights & circuits */}
        <mesh geometry={rightGeometry} material={materials.armorPlate} />

        {/* Luminous cyan outer rim accent (#38DFFF) */}
        <mesh position={[1.46, 0.7, 0.16]} rotation={[0, 0, -0.12]}>
          <boxGeometry args={[0.035, 1.35, 0.025]} />
          <primitive object={materials.cyanRim} attach="material" />
        </mesh>
        <mesh position={[0.96, -1.2, 0.15]} rotation={[0, 0, 0.42]}>
          <boxGeometry args={[0.035, 1.25, 0.025]} />
          <primitive object={materials.cyanRim} attach="material" />
        </mesh>

        {/* Restrained cyber gold accent (#D9AE55) along top crest */}
        <mesh position={[0.85, 1.76, 0.19]} rotation={[0, 0, 0.16]}>
          <boxGeometry args={[0.55, 0.035, 0.025]} />
          <primitive object={materials.goldTrim} attach="material" />
        </mesh>
        {/* Restrained gold accent along upper flank */}
        <mesh position={[1.42, 1.42, 0.18]} rotation={[0, 0, -0.52]}>
          <boxGeometry args={[0.26, 0.032, 0.022]} />
          <primitive object={materials.goldTrim} attach="material" />
        </mesh>

        {/* Central Seam Interlocking Receivers & Quantum Pins */}
        {[-0.8, 0.1, 1.0].map((yPos, i) => (
          <group key={`r-tooth-${i}`} position={[0.015, yPos, 0.09]}>
            <mesh>
              <boxGeometry args={[0.03, 0.14, 0.08]} />
              <primitive object={materials.armorPlate} attach="material" />
            </mesh>
            <mesh position={[0, 0, 0.042]}>
              <boxGeometry args={[0.018, 0.08, 0.018]} />
              <primitive object={materials.seamCore} attach="material" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
