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
