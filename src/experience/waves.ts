import { motionScale } from './settings'

// Keep these coefficients identical to the GLSL in Ocean.ts.
export function waveHeight(x: number, z: number, time: number) {
  let h = 0
  h += Math.sin(x * 0.085 + time * 0.85) * 0.34
  h += Math.sin(z * 0.11 + time * 1.05) * 0.24
  h += Math.sin((x + z) * 0.05 + time * 0.55) * 0.2
  h += Math.sin(x * 0.37 - z * 0.29 + time * 1.7) * 0.055
  return h * motionScale()
}

export const WAVE_GLSL = /* glsl */ `
float getWave(vec2 p) {
  float h = 0.0;
  h += sin(p.x * 0.085 + uTime * 0.85) * 0.34;
  h += sin(p.y * 0.11 + uTime * 1.05) * 0.24;
  h += sin((p.x + p.y) * 0.05 + uTime * 0.55) * 0.20;
  h += sin((p.x * 0.37 - p.y * 0.29) + uTime * 1.70) * 0.055;
  return h * uAmp;
}
vec3 getWaveNormal(vec2 p) {
  float e = 0.8;
  float hL = getWave(p - vec2(e, 0.0));
  float hR = getWave(p + vec2(e, 0.0));
  float hD = getWave(p - vec2(0.0, e));
  float hU = getWave(p + vec2(0.0, e));
  return normalize(vec3(hL - hR, e * 2.0, hD - hU));
}
`
