import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface OrbitalRingsProps {
  active?: boolean
}

/**
 * Revolving Orbital Rings:
 * - Positioned in depth to cleanly frame the shield without slicing through its face.
 * - Luminous cyan-blue (#38DFFF) and warm golden amber (#D9AE55) energy curves.
 * - Orbiting quantum qubit beads with independent rotation speeds.
 */
export function OrbitalRings({ active = true }: OrbitalRingsProps) {
  const cyanRingRef = useRef<THREE.Group>(null)
  const goldRingRef = useRef<THREE.Group>(null)
  const outerRingRef = useRef<THREE.Group>(null)

  // Node refs for orbiting beads along the rings
  const cyanNode1Ref = useRef<THREE.Mesh>(null)
  const cyanNode2Ref = useRef<THREE.Mesh>(null)
  const goldNode1Ref = useRef<THREE.Mesh>(null)
  const goldNode2Ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const speedMult = active ? 1.0 : 0.4

    // 1. Cyan Ring Rotation
    if (cyanRingRef.current) {
      cyanRingRef.current.rotation.z = t * 0.18 * speedMult
      cyanRingRef.current.rotation.x = Math.sin(t * 0.12) * 0.08 + 0.45
    }

    // Cyan Node 1 orbiting along radius 2.14
    if (cyanNode1Ref.current) {
      const angle1 = t * 0.75 * speedMult
      cyanNode1Ref.current.position.x = Math.cos(angle1) * 2.14
      cyanNode1Ref.current.position.y = Math.sin(angle1) * 2.14
    }
    // Cyan Node 2 orbiting opposite
    if (cyanNode2Ref.current) {
      const angle2 = t * 0.75 * speedMult + Math.PI
      cyanNode2Ref.current.position.x = Math.cos(angle2) * 2.14
      cyanNode2Ref.current.position.y = Math.sin(angle2) * 2.14
    }

    // 2. Gold Ring Rotation (opposing inclination)
    if (goldRingRef.current) {
      goldRingRef.current.rotation.z = -t * 0.15 * speedMult
      goldRingRef.current.rotation.y = Math.cos(t * 0.14) * 0.09 - 0.52
    }

    // Gold Node 1 orbiting along radius 2.45
    if (goldNode1Ref.current) {
      const angleG1 = -t * 0.65 * speedMult
      goldNode1Ref.current.position.x = Math.cos(angleG1) * 2.45
      goldNode1Ref.current.position.y = Math.sin(angleG1) * 2.45
    }
    // Gold Node 2 orbiting offset
    if (goldNode2Ref.current) {
      const angleG2 = -t * 0.65 * speedMult + Math.PI * 0.85
      goldNode2Ref.current.position.x = Math.cos(angleG2) * 2.45
      goldNode2Ref.current.position.y = Math.sin(angleG2) * 2.45
    }

    // 3. Outer Equatorial Ring
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = t * 0.08 * speedMult
      outerRingRef.current.rotation.x = -0.22 + Math.sin(t * 0.1) * 0.04
    }
  })

  return (
    <group position={[0, 0, -0.06]}>
      {/* 1. Primary Luminous Cyan-Blue Orbital Ring (#38DFFF) */}
      <group ref={cyanRingRef} rotation={[0.45, 0.25, 0]}>
        <mesh>
          <torusGeometry args={[2.14, 0.009, 16, 96]} />
          <meshBasicMaterial
            color="#38dfff"
            transparent
            opacity={active ? 0.38 : 0.18}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* Traveling Cyan Qubit Bead 1 */}
        <mesh ref={cyanNode1Ref}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color="#a5f3fc" />
        </mesh>
        {/* Traveling Cyan Qubit Bead 2 */}
        <mesh ref={cyanNode2Ref}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshBasicMaterial color="#38dfff" />
        </mesh>
      </group>

      {/* 2. Primary Warm Golden Amber Orbital Ring (#D9AE55) */}
      <group ref={goldRingRef} rotation={[-0.42, -0.35, 0]}>
        <mesh>
          <torusGeometry args={[2.45, 0.009, 16, 96]} />
          <meshBasicMaterial
            color="#d9ae55"
            transparent
            opacity={active ? 0.35 : 0.16}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* Traveling Golden Qubit Bead 1 */}
        <mesh ref={goldNode1Ref}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
        {/* Traveling Golden Qubit Bead 2 */}
        <mesh ref={goldNode2Ref}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshBasicMaterial color="#d9ae55" />
        </mesh>
      </group>

      {/* 3. Outer Equatorial Containment Ring */}
      <group ref={outerRingRef} rotation={[-0.22, 0.15, 0]}>
        <mesh>
          <torusGeometry args={[2.78, 0.007, 12, 80]} />
          <meshBasicMaterial
            color="#2563eb"
            transparent
            opacity={active ? 0.22 : 0.10}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </group>
  )
}
