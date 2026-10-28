import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { createFullShieldShape } from './shieldGeometries'

interface HolographicShieldProps {
  opacity: number
}

/**
 * Holographic Shield Layer (Matching Reference Image Panel 3):
 * - Electric cyan outer contour rim with bright luminous edges.
 * - Fine triangular wireframe / geodesic scanning lattice across the face.
 * - Translucent electric-blue energy surface with vertical scanning wave.
 * - Hovering cleanly in front of the metallic shield (zero z-fighting).
 */
export function HolographicShield({ opacity }: HolographicShieldProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const wireframeRef = useRef<THREE.LineSegments>(null)
  const rimRef = useRef<THREE.LineLoop>(null)
  const scanLineRef = useRef<THREE.Mesh>(null)

  // Geometries for the holographic forcefield
  const { shapeGeo, rimGeo, wireframeGeo } = useMemo(() => {
    const shape = createFullShieldShape()

    // 1. Triangular tessellated face geometry (subdivided for rich cyber lattice)
    const shapeGeo = new THREE.ShapeGeometry(shape, 12)

    // 2. Outer contour rim
    const points = shape.getPoints(64)
    const rimPoints = points.map((p) => new THREE.Vector3(p.x, p.y, 0))
    const rimGeo = new THREE.BufferGeometry().setFromPoints(rimPoints)

    // 3. Triangular wireframe lines
    const wireframeGeo = new THREE.WireframeGeometry(shapeGeo)

    return { shapeGeo, rimGeo, wireframeGeo }
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    // Subtle breathing pulse of the energy field
    const pulse = 0.88 + 0.12 * Math.sin(t * 3.2)

    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = opacity * 0.14 * pulse
    }

    if (wireframeRef.current) {
      const lineMat = wireframeRef.current.material as THREE.LineBasicMaterial
      lineMat.opacity = opacity * (0.35 + 0.15 * Math.sin(t * 2.8))
    }

    if (rimRef.current) {
      const rimMat = rimRef.current.material as THREE.LineBasicMaterial
      rimMat.opacity = opacity * (0.85 + 0.15 * Math.cos(t * 4.0))
    }

    // Vertical holographic scanning bar moving smoothly across the shield
    if (scanLineRef.current) {
      const scanY = 1.6 - ((t * 1.2) % 3.6)
      scanLineRef.current.position.y = scanY
      const scanMat = scanLineRef.current.material as THREE.MeshBasicMaterial
      scanMat.opacity = opacity * 0.45 * (1 - Math.abs(scanY) / 2.2)
    }
  })

  if (opacity <= 0.005) {
    return null
  }

  return (
    <group position={[0, 0, 0.22]} scale={[1.025, 1.025, 1.0]}>
      {/* 1. Translucent Electric-Blue Energy Membrane */}
      <mesh ref={meshRef} geometry={shapeGeo}>
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Fine Cyan Triangular / Geodesic Wireframe Lattice */}
      <lineSegments ref={wireframeRef} geometry={wireframeGeo}>
        <lineBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* 3. Luminous Outer Contour Rim */}
      <lineLoop ref={rimRef} geometry={rimGeo}>
        <lineBasicMaterial
          color="#a5f3fc"
          transparent
          opacity={0.85}
          linewidth={2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineLoop>

      {/* 4. Horizontal Holographic Scanning Wave Bar */}
      <mesh ref={scanLineRef} position={[0, 0, 0.01]}>
        <planeGeometry args={[2.8, 0.06]} />
        <meshBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
