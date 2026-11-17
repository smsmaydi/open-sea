export const FOG = {
  color: '#c5dff0',
  near: 55,
  far: 210,
}

export const TUNE = {
  maxSpeed: 13,
  reverseSpeed: 4.2,
  accel: 8,
  brake: 11,
  turnRate: 1.35,
  worldRadius: 108,
  triggerPadding: 9,
  collisionPadding: 3.8,
  cameraDistance: 15,
  cameraHeight: 7.6,
  cameraLookAhead: 3.2,
  cameraLookHeight: 1.7,
  mobileDistance: 12,
  mobileHeight: 8.6,
  mobileLookHeight: 2.1,
  focusDistance: 11,
  waveAmp: 1,
}

export function motionScale() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0.2
  return 1
}

export type Quality = {
  /** True when the window is phone-sized. Chosen once, when the world is created. */
  phone: boolean
  /** Canvas pixel ratio cap. Phones stay lower so the sea shader does not fill a 3x buffer. */
  dpr: [number, number]
  /** Shadow map edge length. */
  shadowMap: number
  /** Water grid divisions along one side. The swell formula itself does not change. */
  waterSegments: number
  /** Reflection target edge length. The mirror is already faint, so phones can use a smaller one. */
  waterTexture: number
}

/** Desktop keeps a sharper buffer. A phone-sized window spends that cost on frame rate instead. */
export function readQuality(): Quality {
  const phone = window.matchMedia('(max-width: 760px)').matches
  if (phone) {
    return { phone: true, dpr: [1, 1.35], shadowMap: 1024, waterSegments: 96, waterTexture: 256 }
  }
  return { phone: false, dpr: [1, 1.5], shadowMap: 1536, waterSegments: 128, waterTexture: 512 }
}
