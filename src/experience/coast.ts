import * as THREE from 'three'

/** One island's shoreline. Points are local X and Z. `radiusAt` uses atan2(x, z). */
export type Coast = {
  /** @param angle - atan2(x, z), in radians. @returns Distance from the center to the shore. */
  radiusAt: (angle: number) => number
  /** Closed outline. The farthest point is `radius` times the fit, so land stays inside the collider. */
  points: THREE.Vector2[]
}

/** Seeded 0..1 value. The same seed always rebuilds the same island. */
function hash(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Makes a stretched, dented coastline and scales it so nothing sticks past the gameplay radius.
 * @param radius - Island radius from the content data, in meters.
 * @param seed - Stable number for this island.
 * @param count - How many samples go around the shore.
 * @returns The outline and a function that measures it at any angle.
 */
export function makeCoast(radius: number, seed: number, count = 42): Coast {
  const rng = hash(seed)
  const lobes = 6
  const controls = Array.from({ length: lobes }, () => 0.58 + rng() * 0.62)
  const stretchX = 0.86 + rng() * 0.32
  const stretchZ = 0.86 + rng() * 0.32
  const coveAngle = rng() * Math.PI * 2
  const coveAmp = 0.16 + rng() * 0.14
  const spitAngle = coveAngle + 1.7 + rng() * 1.2
  const spitAmp = 0.1 + rng() * 0.1

  const field = (angle: number) => {
    const wrapped = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    const t = (wrapped / (Math.PI * 2)) * lobes
    const index = Math.floor(t) % lobes
    const next = (index + 1) % lobes
    const f = t - Math.floor(t)
    const smooth = f * f * (3 - 2 * f)
    let wobble = controls[index] * (1 - smooth) + controls[next] * smooth
    const coveGap = Math.abs(wrapped - coveAngle) % (Math.PI * 2)
    const coveDist = coveGap > Math.PI ? Math.PI * 2 - coveGap : coveGap
    const spitGap = Math.abs(wrapped - spitAngle) % (Math.PI * 2)
    const spitDist = spitGap > Math.PI ? Math.PI * 2 - spitGap : spitGap
    const cove = Math.exp(-(coveDist * coveDist) / 0.22)
    const spit = Math.exp(-(spitDist * spitDist) / 0.18)
    wobble *= 1 - coveAmp * cove + spitAmp * spit
    const x = Math.sin(angle) * wobble * stretchX
    const z = Math.cos(angle) * wobble * stretchZ
    return { x, z, len: Math.hypot(x, z) }
  }

  let max = 0.001
  for (let i = 0; i < count; i += 1) max = Math.max(max, field((i / count) * Math.PI * 2).len)
  const fit = (radius * 0.9) / max
  const points: THREE.Vector2[] = []
  for (let i = 0; i < count; i += 1) {
    const sample = field((i / count) * Math.PI * 2)
    points.push(new THREE.Vector2(sample.x * fit, sample.z * fit))
  }

  return {
    points,
    radiusAt: (angle: number) => field(angle).len * fit,
  }
}

/**
 * Turns the outline into a Three.js shape.
 * Shape Y is the negated Z, so rotating the mesh -90° around X lays it flat on the sea.
 * @param points - Local XZ outline.
 * @param scale - 1 is the full shore. Smaller values inset sand or grass.
 * @returns A closed shape.
 */
export function coastShape(points: THREE.Vector2[], scale = 1) {
  const shape = new THREE.Shape()
  points.forEach((point, index) => {
    const x = point.x * scale
    const y = -point.y * scale
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  })
  shape.closePath()
  return shape
}
