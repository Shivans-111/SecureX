import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface LightningArcsProps {
  active: boolean
}

interface ArcBranch {
  points: THREE.Vector3[]
  isGold: boolean
}

/**
 * Midpoint displacement algorithm for irregular, branching, high-energy lightning.
 */
function generateLightningBranch(
  start: THREE.Vector3,
  end: THREE.Vector3,
  displace: number,
  depth: number,
  branches: ArcBranch[],
  isGold: boolean
) {
  if (depth === 0) {
    branches.push({ points: [start, end], isGold })
    return
  }

  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const dir = new THREE.Vector3().subVectors(end, start).normalize()

  // Tangential and perpendicular jagged perturbation
  const randomPerp = new THREE.Vector3(
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 0.8
  ).cross(dir).normalize()

  mid.addScaledVector(randomPerp, (Math.random() - 0.5) * displace)

  // Subdivide main trunk
  generateLightningBranch(start, mid, displace * 0.55, depth - 1, branches, isGold)
  generateLightningBranch(mid, end, displace * 0.55, depth - 1, branches, isGold)

  // Natural sub-forks branching outward into space
  if (depth >= 2 && Math.random() > 0.42) {
    const forkDir = new THREE.Vector3(
      (Math.random() - 0.5) * displace * 1.5,
      (Math.random() - 0.5) * displace * 1.5,
      (Math.random() - 0.5) * displace * 0.6
    )
    const forkEnd = mid.clone().add(forkDir)
    generateLightningBranch(mid, forkEnd, displace * 0.45, depth - 1, branches, isGold)
  }
}

/**
 * Enhanced Cinematic Cybersecurity Defense Lightning:
 * 1. Multi-branching electric cyan-blue arcs along the perimeter with bright white cores.
 * 2. Restrained warm golden electrical accents.
 * 3. Subtle surface circuit energy pulses that travel along engraved paths, illuminating adjacent metal panels.
 * 4. High-energy impact discharge on shield join, plus periodic electrical surges.
 * 5. Strictly preserves the metallic blue face without obscuring it.
 */
export function LightningArcs({ active }: LightningArcsProps) {
  const coreLinesRef = useRef<THREE.LineSegments>(null)
  const glowLinesRef = useRef<THREE.LineSegments>(null)
  const goldLinesRef = useRef<THREE.LineSegments>(null)
  const surfaceLinesRef = useRef<THREE.LineSegments>(null)
  const surfaceLightRef = useRef<THREE.PointLight>(null)

  const activationTimestamp = useRef<number | null>(null)
  const lastSurgeTime = useRef<number>(0)
  const surfacePulseState = useRef({
    active: false,
    startTime: 0,
    pathIndex: 0,
    duration: 500, // ms
  })

  useEffect(() => {
    if (active) {
      activationTimestamp.current = performance.now()
    } else {
      activationTimestamp.current = null
    }
  }, [active])

  // Perimeter path segments along the shield's outer contour
  const perimeterSegments = useMemo(() => [
    // Left crest
    { start: new THREE.Vector3(-0.25, 1.88, 0.12), end: new THREE.Vector3(-0.95, 1.86, 0.12) },
    { start: new THREE.Vector3(-0.95, 1.86, 0.12), end: new THREE.Vector3(-1.42, 1.62, 0.12) },
    // Left upper flank & wing
    { start: new THREE.Vector3(-1.42, 1.62, 0.12), end: new THREE.Vector3(-1.56, 1.25, 0.12) },
    { start: new THREE.Vector3(-1.56, 1.25, 0.12), end: new THREE.Vector3(-1.46, 0.50, 0.12) },
    // Left lower blade to tip
    { start: new THREE.Vector3(-1.46, 0.50, 0.12), end: new THREE.Vector3(-1.26, -0.45, 0.12) },
    { start: new THREE.Vector3(-1.26, -0.45, 0.12), end: new THREE.Vector3(-0.82, -1.45, 0.12) },
    { start: new THREE.Vector3(-0.82, -1.45, 0.12), end: new THREE.Vector3(-0.15, -2.14, 0.12) },

    // Right crest
    { start: new THREE.Vector3(0.25, 1.88, 0.12), end: new THREE.Vector3(0.95, 1.86, 0.12) },
    { start: new THREE.Vector3(0.95, 1.86, 0.12), end: new THREE.Vector3(1.42, 1.62, 0.12) },
    // Right upper flank & wing
    { start: new THREE.Vector3(1.42, 1.62, 0.12), end: new THREE.Vector3(1.56, 1.25, 0.12) },
    { start: new THREE.Vector3(1.56, 1.25, 0.12), end: new THREE.Vector3(1.46, 0.50, 0.12) },
    // Right lower blade to tip
    { start: new THREE.Vector3(1.46, 0.50, 0.12), end: new THREE.Vector3(1.26, -0.45, 0.12) },
    { start: new THREE.Vector3(1.26, -0.45, 0.12), end: new THREE.Vector3(0.82, -1.45, 0.12) },
    { start: new THREE.Vector3(0.82, -1.45, 0.12), end: new THREE.Vector3(0.15, -2.14, 0.12) },
  ], [])

  // Outward perimeter atmospheric discharge points (firing into space around shield)
  const outwardArcs = useMemo(() => [
    { start: new THREE.Vector3(-1.42, 1.62, 0.12), end: new THREE.Vector3(-1.95, 1.85, 0.08) },
    { start: new THREE.Vector3(1.42, 1.62, 0.12), end: new THREE.Vector3(1.95, 1.85, 0.08) },
    { start: new THREE.Vector3(-1.56, 1.00, 0.12), end: new THREE.Vector3(-2.15, 1.15, 0.08) },
    { start: new THREE.Vector3(1.56, 1.00, 0.12), end: new THREE.Vector3(2.15, 1.15, 0.08) },
    { start: new THREE.Vector3(-1.26, -0.45, 0.12), end: new THREE.Vector3(-1.75, -0.65, 0.08) },
    { start: new THREE.Vector3(1.26, -0.45, 0.12), end: new THREE.Vector3(1.75, -0.65, 0.08) },
    { start: new THREE.Vector3(0.0, -2.18, 0.12), end: new THREE.Vector3(0.0, -2.75, 0.08) },
    { start: new THREE.Vector3(0.0, 1.84, 0.12), end: new THREE.Vector3(0.0, 2.35, 0.08) },
  ], [])

  // Seam discharge points for impact collision burst
  const seamBurstPairs = useMemo(() => [
    { start: new THREE.Vector3(-0.02, 1.8, 0.14), end: new THREE.Vector3(0.02, 1.0, 0.14) },
    { start: new THREE.Vector3(-0.02, 1.0, 0.14), end: new THREE.Vector3(0.02, 0.2, 0.14) },
    { start: new THREE.Vector3(-0.02, 0.2, 0.14), end: new THREE.Vector3(0.02, -0.6, 0.14) },
    { start: new THREE.Vector3(-0.02, -0.6, 0.14), end: new THREE.Vector3(0.02, -1.4, 0.14) },
    { start: new THREE.Vector3(-0.02, -1.4, 0.14), end: new THREE.Vector3(0.02, -2.15, 0.14) },
  ], [])

  // Controlled Surface Circuit Traces (subtle, integrated, strictly following panel geometry)
  const surfaceCircuitPaths = useMemo(() => [
    // Left upper circuit trace
    [
      new THREE.Vector3(-1.20, 1.15, 0.20),
      new THREE.Vector3(-0.85, 1.15, 0.20),
      new THREE.Vector3(-0.55, 0.85, 0.20),
      new THREE.Vector3(-0.15, 0.85, 0.20),
    ],
    // Right upper circuit trace
    [
      new THREE.Vector3(1.20, 1.15, 0.20),
      new THREE.Vector3(0.85, 1.15, 0.20),
      new THREE.Vector3(0.55, 0.85, 0.20),
      new THREE.Vector3(0.15, 0.85, 0.20),
    ],
    // Left mid circuit trace
    [
      new THREE.Vector3(-1.10, 0.35, 0.20),
      new THREE.Vector3(-0.75, 0.35, 0.20),
      new THREE.Vector3(-0.45, 0.05, 0.20),
      new THREE.Vector3(-0.10, 0.05, 0.20),
    ],
    // Right mid circuit trace
    [
      new THREE.Vector3(1.10, 0.35, 0.20),
      new THREE.Vector3(0.75, 0.35, 0.20),
      new THREE.Vector3(0.45, 0.05, 0.20),
      new THREE.Vector3(0.10, 0.05, 0.20),
    ],
  ], [])

  const { coreGeo, glowGeo, goldGeo, surfaceGeo } = useMemo(() => {
    return {
      coreGeo: new THREE.BufferGeometry(),
      glowGeo: new THREE.BufferGeometry(),
      goldGeo: new THREE.BufferGeometry(),
      surfaceGeo: new THREE.BufferGeometry(),
    }
  }, [])

  useFrame(() => {
    if (!active) {
      if (coreLinesRef.current) coreLinesRef.current.visible = false
      if (glowLinesRef.current) glowLinesRef.current.visible = false
      if (goldLinesRef.current) goldLinesRef.current.visible = false
      if (surfaceLinesRef.current) surfaceLinesRef.current.visible = false
      if (surfaceLightRef.current) surfaceLightRef.current.intensity = 0
      return
    }

    const now = performance.now()
    const impactDuration = 650 // 650ms impact pulse
    const elapsed = activationTimestamp.current ? now - activationTimestamp.current : 9999
    const isImpact = elapsed < impactDuration

    // Periodic surge every 4.8s lasting 380ms
    if (now - lastSurgeTime.current > 4800) {
      lastSurgeTime.current = now
    }
    const isSurge = now - lastSurgeTime.current < 380

    // Ensure lines are visible
    if (coreLinesRef.current) coreLinesRef.current.visible = true
    if (glowLinesRef.current) glowLinesRef.current.visible = true
    if (goldLinesRef.current) goldLinesRef.current.visible = true
    if (surfaceLinesRef.current) surfaceLinesRef.current.visible = true

    // Set dynamic opacity based on surge/impact
    const glowMat = glowLinesRef.current?.material as THREE.LineBasicMaterial
    const coreMat = coreLinesRef.current?.material as THREE.LineBasicMaterial
    const goldMat = goldLinesRef.current?.material as THREE.LineBasicMaterial

    if (glowMat) glowMat.opacity = isImpact ? 0.85 : isSurge ? 0.65 : 0.45
    if (coreMat) coreMat.opacity = isImpact ? 1.0 : isSurge ? 0.95 : 0.88
    if (goldMat) goldMat.opacity = isImpact ? 0.90 : isSurge ? 0.85 : 0.72

    const corePositions: number[] = []
    const glowPositions: number[] = []
    const goldPositions: number[] = []
    const surfacePositions: number[] = []

    // 1. Gather active perimeter segments for this frame
    const activePairs: { start: THREE.Vector3; end: THREE.Vector3; isGold: boolean }[] = []

    // During impact: all perimeter segments + seam discharge + outward bursts
    if (isImpact) {
      for (const seg of perimeterSegments) {
        activePairs.push({ ...seg, isGold: Math.random() < 0.22 })
      }
      for (const seg of seamBurstPairs) {
        activePairs.push({ ...seg, isGold: Math.random() < 0.35 })
      }
      for (const arc of outwardArcs) {
        activePairs.push({ ...arc, isGold: Math.random() < 0.25 })
      }
    } else {
      // Normal/Surge continuous mode: pick a dynamic subset of perimeter curves
      const segmentPickCount = isSurge ? 8 : 4
      for (let i = 0; i < segmentPickCount; i++) {
        const randIdx = Math.floor(Math.random() * perimeterSegments.length)
        const seg = perimeterSegments[randIdx]
        const isGold = Math.random() < 0.25 // Restrained gold accent (~25%)
        activePairs.push({ ...seg, isGold })
      }

      // Occasional outward atmospheric discharge arc
      const outwardCount = isSurge ? 3 : 1
      for (let i = 0; i < outwardCount; i++) {
        if (Math.random() < (isSurge ? 0.75 : 0.40)) {
          const randIdx = Math.floor(Math.random() * outwardArcs.length)
          activePairs.push({ ...outwardArcs[randIdx], isGold: Math.random() < 0.28 })
        }
      }
    }

    // 2. Generate jagged fractal lightning for each active pair
    for (const pair of activePairs) {
      const branches: ArcBranch[] = []
      const displace = isImpact ? 0.36 : isSurge ? 0.32 : 0.24
      const depth = isImpact ? 4 : 3
      generateLightningBranch(pair.start, pair.end, displace, depth, branches, pair.isGold)

      for (const branch of branches) {
        const p0 = branch.points[0]
        const p1 = branch.points[1]

        if (branch.isGold) {
          goldPositions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z)
        } else {
          // Electric blue glow line
          glowPositions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z)
          // Bright cyan-white core line
          corePositions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z)
        }
      }
    }

    // 3. Surface Circuit Energy Pulse: occasional spark traveling along circuit paths
    const pulseState = surfacePulseState.current
    if (!pulseState.active) {
      // Trigger new pulse every ~2 seconds
      if (Math.random() < 0.035) {
        pulseState.active = true
        pulseState.startTime = now
        pulseState.pathIndex = Math.floor(Math.random() * surfaceCircuitPaths.length)
      }
    } else {
      const pulseElapsed = now - pulseState.startTime
      const progress = pulseElapsed / pulseState.duration

      if (progress >= 1.0) {
        pulseState.active = false
        if (surfaceLightRef.current) surfaceLightRef.current.intensity = 0
      } else {
        const path = surfaceCircuitPaths[pulseState.pathIndex]
        const totalSegments = path.length - 1
        const currentSegmentF = progress * totalSegments
        const segIdx = Math.min(Math.floor(currentSegmentF), totalSegments - 1)
        const segT = currentSegmentF - segIdx

        const pStart = path[segIdx]
        const pEnd = path[segIdx + 1]
        const currentPos = new THREE.Vector3().lerpVectors(pStart, pEnd, segT)

        // Subtle micro-jagged spark along the circuit
        const sparkBranches: ArcBranch[] = []
        generateLightningBranch(pStart, currentPos, 0.05, 2, sparkBranches, false)
        for (const sb of sparkBranches) {
          surfacePositions.push(
            sb.points[0].x, sb.points[0].y, sb.points[0].z,
            sb.points[1].x, sb.points[1].y, sb.points[1].z
          )
        }

        // Accompanying localized point light illuminating nearby metallic blue panels
        if (surfaceLightRef.current) {
          surfaceLightRef.current.position.set(currentPos.x, currentPos.y, currentPos.z + 0.12)
          // Bell-curve intensity: fade in and fade out
          const pulseIntensity = Math.sin(progress * Math.PI) * 1.25
          surfaceLightRef.current.intensity = pulseIntensity
        }
      }
    }

    // 4. Update geometry buffers
    coreGeo.setAttribute('position', new THREE.Float32BufferAttribute(corePositions, 3))
    glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPositions, 3))
    goldGeo.setAttribute('position', new THREE.Float32BufferAttribute(goldPositions, 3))
    surfaceGeo.setAttribute('position', new THREE.Float32BufferAttribute(surfacePositions, 3))
  })

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Electric-Blue Soft Glow Perimeter Lines (Restrained glow) */}
      <lineSegments ref={glowLinesRef} geometry={glowGeo}>
        <lineBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.45}
          linewidth={1.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* 2. Bright Cyan-White Concentrated Core Lines */}
      <lineSegments ref={coreLinesRef} geometry={coreGeo}>
        <lineBasicMaterial
          color="#f0fbff"
          transparent
          opacity={0.92}
          linewidth={1.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* 3. Restrained Warm Golden Electrical Arcs */}
      <lineSegments ref={goldLinesRef} geometry={goldGeo}>
        <lineBasicMaterial
          color="#ffd166"
          transparent
          opacity={0.85}
          linewidth={1.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* 4. Subtle Surface Circuit Pulse Lines */}
      <lineSegments ref={surfaceLinesRef} geometry={surfaceGeo}>
        <lineBasicMaterial
          color="#38dfff"
          transparent
          opacity={0.95}
          linewidth={1.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* 5. Traveling Circuit Light (illuminates metallic panels as pulse passes) */}
      <pointLight
        ref={surfaceLightRef}
        position={[0, 0, 0.25]}
        color="#38dfff"
        intensity={0}
        distance={2.0}
        decay={2}
      />
    </group>
  )
}
