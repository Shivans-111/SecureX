import * as THREE from 'three'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Procedural geometry definitions for the Secure X shield.
 * Generates two symmetrical halves with precision central seam,
 * clean counter-clockwise winding (consistent +Z front normals),
 * and creased normal calculations to prevent bevel normal bleeding.
 */

const SEAM_OFFSET = 0.015 // Crisp gap along the central locking axis

/**
 * Creates counter-clockwise 2D shape for left or right half.
 * Ensuring both halves have CCW winding guarantees front faces always face +Z.
 */
export function createShieldHalfShape(isLeft: boolean): THREE.Shape {
  const shape = new THREE.Shape()

  if (isLeft) {
    const seamX = -SEAM_OFFSET

    // Left half: start top-center -> crest -> flank -> bottom tip -> seam up
    shape.moveTo(seamX, 1.82)

    // Crest curve
    shape.bezierCurveTo(-0.35, 1.94, -0.85, 1.90, -1.38, 1.68)

    // Upper lateral wing / flank
    shape.bezierCurveTo(-1.52, 1.35, -1.55, 0.50, -1.42, -0.10)

    // Tapering lower blade
    shape.bezierCurveTo(-1.25, -0.85, -0.75, -1.58, seamX, -2.18)

    // Vertical seam back to top
    shape.lineTo(seamX, 1.82)
  } else {
    const seamX = SEAM_OFFSET

    // Right half: start bottom tip -> flank up -> crest up -> top-center -> seam down
    // This reverses traversal to maintain Counter-Clockwise (CCW) winding for right half!
    shape.moveTo(seamX, -2.18)

    // Lower blade curving up
    shape.bezierCurveTo(0.75, -1.58, 1.25, -0.85, 1.42, -0.10)

    // Lateral flank curving up
    shape.bezierCurveTo(1.55, 0.50, 1.52, 1.35, 1.38, 1.68)

    // Crest curving to top-center
    shape.bezierCurveTo(0.85, 1.90, 0.35, 1.94, seamX, 1.82)

    // Vertical seam straight down
    shape.lineTo(seamX, -2.18)
  }

  return shape
}

/**
 * Secondary layered reinforcement panel shape (strictly inset, positive depth, no z-fighting).
 */
export function createShieldFacetShape(isLeft: boolean): THREE.Shape {
  const shape = new THREE.Shape()
  const sign = isLeft ? -1 : 1
  const seamX = sign * (SEAM_OFFSET + 0.035)

  if (isLeft) {
    shape.moveTo(seamX, 1.55)
    shape.bezierCurveTo(-0.30, 1.65, -0.72, 1.60, -1.15, 1.42)
    shape.bezierCurveTo(-1.26, 1.15, -1.26, 0.45, -1.16, -0.05)
    shape.bezierCurveTo(-1.00, -0.72, -0.58, -1.35, seamX, -1.82)
    shape.lineTo(seamX, 1.55)
  } else {
    shape.moveTo(seamX, -1.82)
    shape.bezierCurveTo(0.58, -1.35, 1.00, -0.72, 1.16, -0.05)
    shape.bezierCurveTo(1.26, 0.45, 1.26, 1.15, 1.15, 1.42)
    shape.bezierCurveTo(0.72, 1.60, 0.30, 1.65, seamX, 1.55)
    shape.lineTo(seamX, -1.82)
  }

  return shape
}

/**
 * Unified outer shape for the forcefield envelope.
 */
export function createFullShieldShape(): THREE.Shape {
  const shape = new THREE.Shape()

  // Start top-center crest
  shape.moveTo(0, 1.84)

  // Left crest, flank, and blade
  shape.bezierCurveTo(-0.35, 1.95, -0.86, 1.91, -1.40, 1.69)
  shape.bezierCurveTo(-1.54, 1.36, -1.56, 0.51, -1.43, -0.09)
  shape.bezierCurveTo(-1.26, -0.86, -0.75, -1.59, 0, -2.20)

  // Right blade, flank, and crest back to top
  shape.bezierCurveTo(0.75, -1.59, 1.26, -0.86, 1.43, -0.09)
  shape.bezierCurveTo(1.56, 0.51, 1.54, 1.36, 1.40, 1.69)
  shape.bezierCurveTo(0.86, 1.91, 0.35, 1.95, 0, 1.84)

  return shape
}

export const shieldExtrudeSettings: THREE.ExtrudeGeometryOptions = {
  depth: 0.14,
  bevelEnabled: true,
  bevelThickness: 0.05,
  bevelSize: 0.04,
  bevelOffset: 0,
  bevelSegments: 3,
  curveSegments: 36,
}

export const facetExtrudeSettings: THREE.ExtrudeGeometryOptions = {
  depth: 0.035,
  bevelEnabled: true,
  bevelThickness: 0.02,
  bevelSize: 0.02,
  bevelOffset: 0,
  bevelSegments: 2,
  curveSegments: 32,
}

export const hologramExtrudeSettings: THREE.ExtrudeGeometryOptions = {
  depth: 0.06,
  bevelEnabled: true,
  bevelThickness: 0.025,
  bevelSize: 0.025,
  bevelSegments: 2,
  curveSegments: 32,
}

/**
 * Helper to build creased geometry.
 * Creasing at 32 degrees splits bevel normals from the flat face normals,
 * completely preventing dark diagonal triangular shading across the shield face.
 */
export function createCreasedHalfShieldGeometry(isLeft: boolean): THREE.BufferGeometry {
  const shape = createShieldHalfShape(isLeft)
  const rawGeo = new THREE.ExtrudeGeometry(shape, shieldExtrudeSettings)
  const creasedGeo = toCreasedNormals(rawGeo, THREE.MathUtils.degToRad(32))
  rawGeo.dispose()

  // Generate symmetrical normalized UV mapping across the shield face
  const pos = creasedGeo.getAttribute('position')
  const uvArray = new Float32Array(pos.count * 2)

  const minY = -2.2
  const spanY = 4.15

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)

    // Symmetrical texture mapping:
    // Distance from center seam (0 to 1.55) maps across the rich tech panel (u: 0.95 -> 0.16)
    // Both halves mirror identically so circuit engravings and panel lines meet gracefully at the seam
    const distFromCenter = Math.min(Math.abs(x) / 1.55, 1.0)
    let u = 0.95 - distFromCenter * 0.78
    let v = (y - minY) / spanY

    // For side bevels and edges, smoothly fold in depth
    if (z < 0.04) {
      u += (0.04 - z) * 0.25
    }

    uvArray[i * 2] = u
    uvArray[i * 2 + 1] = v
  }

  creasedGeo.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2))
  return creasedGeo
}

export function createCreasedFacetGeometry(isLeft: boolean): THREE.BufferGeometry {
  const shape = createShieldFacetShape(isLeft)
  const rawGeo = new THREE.ExtrudeGeometry(shape, facetExtrudeSettings)
  const creasedGeo = toCreasedNormals(rawGeo, THREE.MathUtils.degToRad(32))
  rawGeo.dispose()

  const pos = creasedGeo.getAttribute('position')
  const uvArray = new Float32Array(pos.count * 2)
  const minY = -1.85
  const spanY = 3.45

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const distFromCenter = Math.min(Math.abs(x) / 1.3, 1.0)
    const u = 0.90 - distFromCenter * 0.70
    const v = (y - minY) / spanY
    uvArray[i * 2] = u
    uvArray[i * 2 + 1] = v
  }
  creasedGeo.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2))
  return creasedGeo
}

export function createCreasedHologramGeometry(): {
  geometry: THREE.BufferGeometry
  wireframeGeometry: THREE.BufferGeometry
} {
  const shape = createFullShieldShape()
  const rawGeo = new THREE.ExtrudeGeometry(shape, hologramExtrudeSettings)
  const creasedGeo = toCreasedNormals(rawGeo, THREE.MathUtils.degToRad(32))
  rawGeo.dispose()
  const wireframe = new THREE.EdgesGeometry(creasedGeo, 18)
  return { geometry: creasedGeo, wireframeGeometry: wireframe }
}
