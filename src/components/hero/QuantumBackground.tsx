import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

/**
 * Clean Environmental Depth Layer:
 * - NO floor grid whatsoever: completely clean laboratory floor showcasing the cinematic photo.
 * - NO duplicate dais, lamp models, or wireframe brackets.
 * - Subtle floating quantum energy particles (qubits) providing depth and gentle drift.
 * - Soft ambient point lights matching the quantum cryostats.
 */
export function QuantumBackground() {
  const bgGroupRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Floating Quantum Qubits (Energy Points)
  const particleGeo = useMemo(() => {
    const count = 65
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    const cyan = new THREE.Color('#38dfff')
    const gold = new THREE.Color('#ffd166')

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 1.8 + Math.random() * 4.5
      const x = Math.cos(angle) * radius
      const y = -1.2 + Math.random() * 4.0
      const z = -1.2 - Math.random() * 4.5

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      const isGold = Math.random() > 0.65
      const col = isGold ? gold : cyan
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    // Gentle particle drift
    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.015
    }

    // Subtle background parallax shift via ref (zero React state re-renders)
    if (bgGroupRef.current) {
      bgGroupRef.current.position.x = mouseRef.current.x * -0.08
      bgGroupRef.current.position.y = mouseRef.current.y * -0.05
    }
  })

  return (
    <group ref={bgGroupRef} position={[0, 0, 0]}>
      {/* Soft Atmospheric Accent Lights Matching Dilution Cryostats */}
      <pointLight position={[-4.5, 0.8, -3.0]} color="#38dfff" intensity={1.1} distance={6} decay={2} />
      <pointLight position={[4.5, 0.8, -3.0]} color="#ffd166" intensity={1.1} distance={6} decay={2} />

      {/* Cyan and Gold Floating Energy Qubits */}
      <points ref={particlesRef} geometry={particleGeo}>
        <pointsMaterial
          size={0.034}
          vertexColors
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}
