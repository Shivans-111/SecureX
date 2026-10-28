import { useState, useCallback, useEffect, Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { ShieldCore } from './ShieldCore'
import { OrbitalRings } from './OrbitalRings'
import { LightningArcs } from './LightningArcs'
import { QuantumBackground } from './QuantumBackground'

interface ShieldCanvasProps {
  onAssembled: () => void
  replayKey?: number
}

/**
 * Custom Deep-Sapphire Environment Generator:
 * Generates soft sapphire and royal-blue ambient reflections on the GPU,
 * completely eliminating any white area lights or specular blowout.
 */
function SapphireSceneEnvironment() {
  const { gl, scene } = useThree()

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl)
    pmremGenerator.compileEquirectangularShader()

    const envScene = new THREE.Scene()
    const envGeo = new THREE.SphereGeometry(12, 24, 16)
    const envMat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      color: '#071630',
    })
    const envMesh = new THREE.Mesh(envGeo, envMat)
    envScene.add(envMesh)

    // Soft royal-blue upper fill sphere (creates rich royal-blue reflections #2468C9)
    const topLight = new THREE.DirectionalLight('#2468c9', 1.0)
    topLight.position.set(0, 8, 4)
    envScene.add(topLight)

    const renderTarget = pmremGenerator.fromScene(envScene, 0.04)
    scene.environment = renderTarget.texture
    scene.environmentIntensity = 0.22

    return () => {
      renderTarget.dispose()
      pmremGenerator.dispose()
      envGeo.dispose()
      envMat.dispose()
      scene.environment = null
    }
  }, [gl, scene])

  return null
}

/**
 * 3D WebGL Shield Stage:
 * - Solid deep sapphire blue metallic shield (#123B78) with royal blue highlights (#2468C9).
 * - Restrained, clean lighting allowing engraved circuitry and titanium armor details to shine.
 * - Central shield scaled up by 10% for ideal hero prominence without colliding with UI.
 * - Cyan (#38DFFF) and gold (#D9AE55) rim lighting along the outside edges.
 * - Zero floor grid; clean laboratory background.
 * - Revolving electric cyan and golden orbital rings framing the shield in depth.
 * - Controlled lightning arcs with restrained ambient glow.
 */
export function ShieldCanvas({ onAssembled, replayKey = 0 }: ShieldCanvasProps) {
  const [isAssembled, setIsAssembled] = useState(false)

  // Reset when replay is initiated
  useEffect(() => {
    setIsAssembled(false)
  }, [replayKey])

  const handleShieldAssembled = useCallback(() => {
    setIsAssembled(true)
    onAssembled()
  }, [onAssembled])

  return (
    <div className="canvas-wrapper">
      <Canvas
        camera={{ position: [0, 0.45, 8.6], fov: 36 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.88,
        }}
      >
        <Suspense fallback={null}>
          {/* 1. Sapphire Blue Environment Reflections (Zero white area lights) */}
          <SapphireSceneEnvironment />

          {/* 2. Deep Blue Ambient Base (ensures deep sapphire shadow foundation) */}
          <ambientLight intensity={0.65} color="#081a38" />

          {/* 3. Frontal Royal-Blue Key Light (#2468C9) bathing the shield face */}
          <directionalLight
            position={[0, 1.2, 5.2]}
            intensity={1.75}
            color="#2468c9"
          />

          {/* 4. Left Sapphire Fill Light (#1D4ED8) */}
          <directionalLight
            position={[-2.4, 0.5, 4.0]}
            intensity={1.4}
            color="#1d4ed8"
          />

          {/* 5. Right Sapphire Fill Light (#1D4ED8) */}
          <directionalLight
            position={[2.4, 0.5, 4.0]}
            intensity={1.4}
            color="#1d4ed8"
          />

          {/* 6. Luminous Cyan-Blue Rim Light for crisp outer edge glow (#38DFFF) */}
          <directionalLight
            position={[-4.5, 1.8, 2.5]}
            intensity={2.4}
            color="#38dfff"
          />

          {/* 7. Warm Golden Rim Light for edge contrast (#D9AE55) */}
          <directionalLight
            position={[4.5, -0.6, 2.5]}
            intensity={1.8}
            color="#d9ae55"
          />

          {/* 8. Soft Upward Bounce from reflective laboratory floor */}
          <directionalLight
            position={[0, -3.5, 3.0]}
            intensity={0.45}
            color="#092244"
          />

          {/* 9. Quantum Computing Laboratory Environment (Clean, zero grid) */}
          <QuantumBackground />

          {/* 10. Centered Deep Metallic Blue Shield Group — Scaled +10% to 0.616 */}
          <group position={[0, 1.08, 0]} scale={[0.616, 0.616, 0.616]}>
            <ShieldCore onAssembled={handleShieldAssembled} replayKey={replayKey} />
            <OrbitalRings active={isAssembled} />
            <LightningArcs active={isAssembled} />
          </group>

          {/* 11. Controlled bloom: restrained intensity to prevent excessive blue glow */}
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.93}
              luminanceSmoothing={0.20}
              intensity={0.16}
              mipmapBlur
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  )
}
