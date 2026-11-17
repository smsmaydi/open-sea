import * as THREE from 'three'

type LitOptions = {
  roughness?: number
  metalness?: number
  emissive?: string
  emissiveIntensity?: number
  flat?: boolean
}

export function lit(color: string, opts: LitOptions = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.86,
    metalness: opts.metalness ?? 0,
    emissive: opts.emissive ?? '#000000',
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    flatShading: opts.flat ?? true,
  })
}

export const mats = {
  wood: lit('#8d5a32', { roughness: 0.9 }),
  woodDark: lit('#5a3822', { roughness: 0.92 }),
  woodLite: lit('#a86c3d', { roughness: 0.84 }),
  red: lit('#8e2d2d', { roughness: 0.78 }),
  gold: lit('#e0b15a', { roughness: 0.45, metalness: 0.35 }),
  metal: lit('#4d555c', { roughness: 0.4, metalness: 0.55 }),
  wall: lit('#ead8b8', { roughness: 0.9 }),
  white: lit('#f4f1ea', { roughness: 0.7 }),
  blueRoof: lit('#2c5ea8', { roughness: 0.55 }),
  serpent: lit('#2f6b4e', { roughness: 0.7 }),
  glass: lit('#f2d48a', { emissive: '#f2b84a', emissiveIntensity: 0.55, roughness: 0.25, flat: false }),
  leaf: lit('#2f8f4e', { roughness: 0.8 }),
  leafDark: lit('#1f6d38', { roughness: 0.85 }),
  trunk: lit('#6b4428', { roughness: 0.95 }),
  flame: lit('#ff8a3d', { emissive: '#ff6a1a', emissiveIntensity: 1.1, roughness: 0.4 }),
  bottle: lit('#2f8f86', { roughness: 0.25, metalness: 0.05, flat: false }),
  cork: lit('#c4a36a', { roughness: 0.8 }),
}
